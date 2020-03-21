import { Component } from "react";
import Layout from "../../components/layout";
import GameWorker from "../../workers/game.worker";

interface GameProps {}

export default class extends Component {
  state = {};

  worker: GameWorker = null;

  componentDidMount() {
    this.worker = new GameWorker();
    this.worker.postMessage("from Host");
    // this.worker.addEventListener('message', this.onWorkerMessage)
  }
  componentWillUnmount() {
    // Close the Worker thread
    this.worker.terminate();
  }

  render() {
    return (
      <Layout>
        <style jsx>{``}</style>
      </Layout>
    );
  }
}
