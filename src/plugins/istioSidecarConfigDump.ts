import {ActionGroupSpec, ActionContextType, ActionOutputStyle, ActionOutput, ActionContextOrder, ActionSpec} from '../actions/actionSpec'
import IstioPluginHelper from '../k8s/istioPluginHelper'
import ActionContext from '../actions/actionContext';
import JsonUtil from '../util/jsonUtil';
import IstioFunctions from '../k8s/istioFunctions';

async function outputConfig(action: ActionSpec, actionContext: ActionContext, 
                              sidecars: any[], type: string, titleField: string, dataField?: string) {
  action.onOutput &&
    action.onOutput([["", "Istio IngressGateway " + type]], ActionOutputStyle.Table)
  action.showOutputLoading && action.showOutputLoading(true)

  for(const sidecar of sidecars) {
    action.onStreamOutput  && action.onStreamOutput([[">Sidecar: " + sidecar.title, ""]])
    const cluster = actionContext.getClusters().filter(c => c.name === sidecar.cluster)[0]
    const output: ActionOutput = []

    const configs = await IstioFunctions.getIstioProxyConfigDump(cluster.k8sClient, sidecar.namespace, sidecar.pod, type)
    configs.forEach(c => {
      output.push([">>"+JsonUtil.extract(c, titleField)])
      let data = dataField ? JsonUtil.extract(c, dataField) : c
      if(data instanceof Array) {
        data.forEach(item => output.push([item]))
      } else {
        output.push([data])
      }
    })
    action.onStreamOutput  && action.onStreamOutput(output)
  }
  action.showOutputLoading && action.showOutputLoading(false)
}

const plugin : ActionGroupSpec = {
  context: ActionContextType.Istio,
  title: "Istio Sidecars Recipes",
  order: ActionContextOrder[ActionContextType.Istio]+3,
  actions: [
    {
      name: "Sidecar Clusters Config Dump",
      order: 47,
      choose: IstioPluginHelper.chooseSidecar.bind(IstioPluginHelper, 1, 1),
      
      async act(actionContext) {
        const sidecars = IstioPluginHelper.getSelectedSidecars(actionContext)
        await outputConfig(this, actionContext, sidecars, "ClustersConfigDump", "cluster.name")
      },
    },
    {
      name: "Sidecar Listeners Config Dump",
      order: 48,
      
      choose: IstioPluginHelper.chooseSidecar.bind(IstioPluginHelper, 1, 1),
      
      async act(actionContext) {
        const sidecars = IstioPluginHelper.getSelectedSidecars(actionContext)
        await outputConfig(this, actionContext, sidecars, "ListenersConfigDump", "listener.name")
      },
    },
    {
      name: "Sidecar Routes Config Dump",
      order: 49,
      
      choose: IstioPluginHelper.chooseSidecar.bind(IstioPluginHelper, 1, 1),
      
      async act(actionContext) {
        const sidecars = IstioPluginHelper.getSelectedSidecars(actionContext)
        await outputConfig(this, actionContext, sidecars, "RoutesConfigDump", "route_config.name", "route_config.virtual_hosts")
      },
    }
  ]
}

export default plugin
