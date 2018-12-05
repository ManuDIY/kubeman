const CommonFunctions = require('../../k8s/commonFunctions')

module.exports = {
  order: 3,
  context: "Namespace",
  actions: [
    {
      name: "Compare Secrets",
      order: 2,
      async act(getClusters, getNamespaces, getK8sClients, onOutput) {
        const clusters = getClusters()
        const k8sClients = getK8sClients()
        const namespaces = getNamespaces()
        const secretsMap = {}

        for(const i in namespaces) {
          const namespace = namespaces[i]
          const nsCluster = namespace.cluster.name
          if(!secretsMap[namespace.name]) {
            secretsMap[namespace.name] = {}
          }

          const k8sClient = clusters.map((c,i) => c.name === nsCluster ? i : -1)
                                    .filter(i => i >= 0).map(i => k8sClients[i])[0]
          
          const secrets = await CommonFunctions.getNamespaceSecrets(namespace.name, k8sClient)
          secrets.forEach(secret => {
            if(!secretsMap[namespace.name][secret.name]) {
              secretsMap[namespace.name][secret.name] = {}
            }
            secretsMap[namespace.name][secret.name][nsCluster] = true
          })
        }

        const output = []
        const headers = ["Namespace/Secret"]
        clusters.forEach(cluster => {
          headers.push("Cluster: " + cluster.name)
        })
        output.push(headers)
      
        namespaces.forEach(namespace => {
          output.push(["Namespace: " + namespace.name, "---", "---"])
          const secretToClusterMap = secretsMap[namespace.name]
          const secrets = secretToClusterMap ? Object.keys(secretToClusterMap) : []
          if(secrets.length === 0) {
            output.push(["No Secrets", "", ""])
          } else {
            secrets.forEach(secret => {
              const clusterMap = secretToClusterMap[secret]
              const row = [secret]
              clusters.forEach(cluster => {
                row.push(clusterMap[cluster.name] ? "Yes" : "No")
              })
              output.push(row)
            })
          }
        })
        onOutput(output, "Compare")
      },
    }
  ]
}