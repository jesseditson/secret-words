import Peer from "simple-peer"
import PubNub from "pubnub"

let pubnub: PubNub
const peerMessageHandlers: Map<
    string,
    (message: any) => Promise<void> | void
> = new Map()

const setupPubNub = (uuid: string) => {
    if (pubnub) {
        return
    }
    pubnub = new PubNub({
        publishKey: process.env.PUBNUB_PUB_KEY,
        subscribeKey: process.env.PUBNUB_SUB_KEY!,
        uuid
    })
    pubnub.addListener({
        message: async ({ channel, message }) => {
            if (peerMessageHandlers.has(channel)) {
                peerMessageHandlers.get(channel)!(message)
            }
        }
    })
}

interface Connection {
    rtcPeer: RTCPeerConnection
    local: Peer.Instance
    remote: Peer.Instance
}

interface Connections {
    byPeer: Map<string, Connection>
}

const connections: Connections = {
    byPeer: new Map()
}

let prevLocalId: string
export const connectToPeer = async (
    localId: string,
    peerId: string,
    onClose: () => void
): Promise<Connection> => {
    if (prevLocalId && prevLocalId !== localId) {
        throw new Error("Cannot change local IDs.")
    }
    if (connections.byPeer.has(peerId)) {
        return connections.byPeer.get(peerId)!
    }
    setupPubNub(localId)
    const sendMessage = (message: any) => {
        pubnub.publish({
            channel: `${localId}->${peerId}`,
            message
        })
    }
    let signals: any[] = []
    let connected = false
    const local = new Peer({ initiator: true, trickle: false })
    const remote = new Peer()

    local.on("signal", data => {
        if (connected) {
            remote.signal(data)
        } else {
            signals.push(data)
        }
    })

    remote.on("signal", data => {
        local.signal(data)
    })

    const connectInterval = setInterval(() => {
        sendMessage("connected")
    }, 1000)
    peerMessageHandlers.set(`${peerId}->${localId}`, data => {
        if (data === "connected") {
            if (!connected) {
                connected = true
                signals.forEach(data => {
                    sendMessage(data)
                })
                signals = []
            }
        } else {
            remote.signal(data)
        }
    })

    const onDisconnect = (error: Error) => {
        connections.byPeer.delete(peerId)
        onClose()
        if (error) {
            throw error
        }
    }
    remote.on("close", onDisconnect)
    local.on("close", onDisconnect)
    remote.on("error", onDisconnect)
    local.on("error", onDisconnect)

    pubnub.subscribe({
        channels: [`${peerId}->${localId}`]
    })

    return new Promise(resolve => {
        local.on("connect", () => {
            clearInterval(connectInterval)
            // @ts-ignore
            const rtcPeer = remote._pc as RTCPeerConnection
            const connection = {
                rtcPeer,
                local,
                remote
            }
            connections.byPeer.set(peerId, connection)
            resolve(connection)
        })
    })
}
