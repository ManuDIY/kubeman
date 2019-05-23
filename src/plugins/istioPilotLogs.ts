import _ from 'lodash'
import {ActionGroupSpec, ActionContextType, ActionOutputStyle, ActionOutput, ActionContextOrder} from '../actions/actionSpec'
import K8sFunctions from '../k8s/k8sFunctions'
import K8sPluginHelper from '../k8s/k8sPluginHelper'
import IstioFunctions from '../k8s/istioFunctions'
import ChoiceManager from '../actions/choiceManager'
import { ContainerInfo, Cluster } from '../k8s/k8sObjectTypes'
import StreamLogger from '../logger/streamLogger'
import OutputManager from '../output/outputManager';

const plugin : ActionGroupSpec = {
  context: ActionContextType.Istio,
  title: "Istio Pilot Recipes",
  order: ActionContextOrder.Istio+1,

  actions: [
    {
      name: "Tail Pilot Logs",
      order: 2,
      outputRowLimit: 100,

      choose: ChoiceManager.chooseClusters.bind(ChoiceManager, 1, 1),
      
      async act(actionContext) {
        this.clear && this.clear(actionContext)
        const cluster = ChoiceManager.getSelectedClusters(actionContext)[0]
        const ingressPods = (await IstioFunctions.getPilotPods(cluster.k8sClient, true))
                            .map(p => p.podDetails)
        K8sPluginHelper.tailPodLogs(ingressPods, "discovery", cluster.k8sClient, this.outputRowLimit, this.onStreamOutput, this.showOutputLoading, this.setScrollMode)
      },

      stop(actionContext) {
        StreamLogger.stop()
      },

      clear(actionContext) {
        this.onOutput && this.onOutput([["Tail Istio Pilot Discovery Logs (All Pods)", ""]], ActionOutputStyle.Log)
      },
    },
    {
      name: "Tail Filtered Pilot Logs",
      order: 3,
      outputRowLimit: 100,
      selectedCluster: undefined,
      filter: undefined,

      choose: ChoiceManager.chooseClusters.bind(ChoiceManager, 1, 1),
      
      async act(actionContext) {
        this.filter = undefined
        this.clear && this.clear(actionContext)
        this.selectedCluster = ChoiceManager.getSelectedClusters(actionContext)[0]
      },
      
      async react(actionContext) {
        this.filter = actionContext.inputText
        this.clear && this.clear(actionContext)
        this.showOutputLoading && this.showOutputLoading(true)
        const ingressPods = (await IstioFunctions.getPilotPods(this.selectedCluster.k8sClient, true))
                            .map(p => p.podDetails)
        K8sPluginHelper.tailPodLogs(ingressPods, "discovery", this.selectedCluster.k8sClient, 
                    this.outputRowLimit, this.onStreamOutput, this.showOutputLoading, this.setScrollMode, this.filter)
        this.showOutputLoading && this.showOutputLoading(false)
      },

      stop(actionContext) {
        StreamLogger.stop()
      },

      clear() {
        let title = "Tail Filtered Istio Pilot Discovery Logs (All Pods)"
        if(this.filter) {
          title += ", Applied Filter: [ " + this.filter + " ]"
        }
        this.onOutput && this.onOutput([[title, ""]], ActionOutputStyle.Log)
      },
    }
  ]
}

export default plugin
