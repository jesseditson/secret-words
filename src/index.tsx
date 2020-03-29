import * as React from "react"
import { render } from "react-dom"
import { v4 as uuid } from "uuid"
import Cookies from "js-cookie"

import { App } from "./components/App"
import { Op } from "./lib/messages"

const getUserId = (): string => {
    let userId = Cookies.get("user_id")
    if (!userId) {
        userId = uuid()
        Cookies.set("user_id", userId)
    }
    return userId
}

const userId = getUserId()
const worker = new Worker("./workers/game.ts")
const sendMessage = (op: Op, data?: object) =>
    worker.postMessage({ userId, op, data })

window.addEventListener("beforeunload", () => {
    sendMessage(Op.BECOME_INACTIVE)
})

render(
    <App worker={worker} sendMessage={sendMessage} userId={userId} />,
    document.getElementById("root")
)
