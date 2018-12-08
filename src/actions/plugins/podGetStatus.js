const jpExtract = require('../../util/jpExtract')
const CommonFunctions = require('../../k8s/commonFunctions')

function generatePodStatusOutput(podsMap) {
  const output = []
  output.push(["Pod", "Created", "Status"])

  Object.keys(podsMap).forEach(cluster => {
    output.push(["Cluster: "+cluster, "---", "---"])

    const namespaces = Object.keys(podsMap[cluster])
    namespaces.forEach(namespace => {
      output.push([">Namespace: "+namespace, "---", "---"])

      const pods = podsMap[cluster][namespace]
      if(pods.length === 0) {
        output.push(["No pods selected", "", ""])
      } else {
        pods.forEach(pod => {
          const meta = jpExtract.extract(pod, "$.metadata", "name", "creationTimestamp")
          const containerStatuses = jpExtract.extractMulti(pod, "$.status.containerStatuses[*]",
                                        "name", "state")
          const containerStatusTable = []
          containerStatuses.forEach(container => {
            containerStatusTable.push(
              container.name + ": " + 
              Object.keys(container.state).map(state => state + ", " + 
                  Object.keys(container.state[state])
                    .map(started => started + " " + container.state[state][started])
                    .join(" ")
                ).join(" ")
            )
          })
          output.push([meta.name, meta.creationTimestamp, containerStatusTable])
        })
      }
    })
  })
  return output
}


module.exports = {
  order: 4,
  context: "Pod",
  actions: [
    {
      name: "Get Pod Status",
      async act(getClusters, getNamespaces, getPods, getK8sClients, onOutput) {
        const clusters = getClusters()
        const namespaces = getNamespaces()
        const pods = getPods()
        const k8sClients = getK8sClients()

        if(clusters.length === 0) {
          onOutput([["No cluster selected"]], "Text")
          return
        }
        if(namespaces.length === 0) {
          onOutput([["No namespace selected"]], "Text")
          return
        }
        if(pods.length === 0) {
          onOutput([["No pods selected"]], "Text")
          return
        }

        const podsMap = {}
        for(const c in clusters) {
          const cluster = clusters[c]
          podsMap[cluster.name] = {}
          const clusterNamespaces = namespaces.filter(ns => ns.cluster.name === cluster.name)
          for(const n in clusterNamespaces) {
            const namespace = clusterNamespaces[n]
            podsMap[cluster.name][namespace.name] = []

            const podNames = pods.filter(pod => pod.namespace.cluster.name === cluster.name)
                          .filter(pod => pod.namespace.name === namespace.name)
                          .map(pod => pod.name)
            if(podNames.length > 0) {
              const nsPods = await CommonFunctions.getNamespacePods(namespace.name, podNames, k8sClients[c])
              nsPods.forEach(pod => pod && podsMap[cluster.name][namespace.name].push(pod))
            }
            const output = generatePodStatusOutput(podsMap)
            onOutput(output, "Health")
          }
        }
      }
    }
  ]
}
