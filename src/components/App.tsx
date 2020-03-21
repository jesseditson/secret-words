import {useEffect} from 'react'
import * as React from 'react'

export const App = () => {

    const receiveMessage = (msg: MessageEvent) => {
        console.log(msg.data)
    }

    let worker: Worker
    useEffect(() => {
        worker = new Worker("../workers/test.ts")
        worker.onmessage = receiveMessage
    })
    return <h1 onClick={() => 
        worker.postMessage("HI")
    }>Secret Words</h1>
}