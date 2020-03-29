import Peer from "simple-peer"
import PubNub from "pubnub"

let pubnub: PubNub
const messageHandlers: Map<
    string,
    (message: any) => Promise<void> | void
> = new Map()
const joinHandlers: Map<string, () => Promise<void> | void> = new Map()

const setupPubNub = (uuid: string) => {
    if (pubnub) {
        return
    }
    pubnub = new PubNub({
        publishKey: process.env.PUBNUB_PUB_KEY,
        subscribeKey: process.env.PUBNUB_SUB_KEY!,
        uuid
    })
    console.log("adding global pubnub listener")
    pubnub.addListener({
        presence: ({ channel, action }) => {
            // console.log(channel, joinHandlers.has(channel))
            if (action === "join" && joinHandlers.has(channel)) {
                joinHandlers.get(channel)!()
            }
        },
        message: ({ channel, message }) => {
            // console.log(channel, messageHandlers.has(channel))
            if (messageHandlers.has(channel)) {
                messageHandlers.get(channel)!(message)
            }
        }
    })
}

interface Connection {
    rtcConnection: RTCPeerConnection
    peer: Peer.Instance
}

interface Connections {
    byPeer: Map<string, Connection>
}

const connections: Connections = {
    byPeer: new Map()
}

let prevLocalId: string
export const connectToPeer = (
    localId: string,
    peerId: string,
    initiator: boolean,
    onClose: () => void
): Promise<Connection> => {
    if (prevLocalId && prevLocalId !== localId) {
        throw new Error("Cannot change local IDs.")
    }
    const existingConnection = connections.byPeer.get(peerId)
    if (existingConnection) {
        console.log(`using existing connection for ${peerId}`)
        return Promise.resolve(existingConnection)
    }
    setupPubNub(localId)
    console.log(`connecting to ${peerId}...`, initiator)

    const receiveChannel = `${peerId}:${localId}`
    const sendChannel = `${localId}:${peerId}`
    const sendMessage = (message: any) => {
        console.log(
            `send to ${sendChannel}`,
            message.type || (message.candidate ? "candidate" : message)
        )
        pubnub.publish({
            channel: sendChannel,
            message
        })
    }
    // Wait for this peer to become available, then make an offer
    pubnub.subscribe({
        channels: [receiveChannel, sendChannel],
        withPresence: true
    })
    const peer = new Peer({
        initiator,
        trickle: false
    })
    const bufferedSignals: any[] = []
    let ready = false
    peer.on("signal", data => {
        if (!ready) {
            bufferedSignals.push(data)
        } else {
            sendMessage(data)
        }
    })
    return new Promise(resolve => {
        const whenListening = () => {
            console.log(`begin handshake with ${peerId}`)
            console.log(`listen on ${receiveChannel}`)
            messageHandlers.set(receiveChannel, data => {
                console.log(
                    "pubsub signal:",
                    data.type || (data.candidate ? "candidate" : data)
                )
                peer.signal(data)
            })
            const onDisconnect = (error?: Error) => {
                console.log("DISCONNECTING")
                connections.byPeer.delete(peerId)
                onClose()
                pubnub.unsubscribeAll()
                if (error) {
                    throw error
                }
            }
            peer.on("close", onDisconnect)
            peer.on("error", e => {
                console.error(`rtc error for peer ${peerId}`, e)
                onDisconnect()
            })
            peer.on("connect", () => {
                console.log(`connected to ${peerId}`)
                // @ts-ignore
                const rtcConnection = remote._pc as RTCPeerConnection
                const connection = {
                    rtcConnection,
                    peer
                }
                connections.byPeer.set(peerId, connection)
                resolve(connection)
            })
            // Kick it off
            bufferedSignals.forEach(data => sendMessage(data))
            ready = true
        }
        const connectWhenReady = () => {
            pubnub
                .hereNow({
                    channels: [`${sendChannel}`]
                })
                .then(({ channels: hereNow }) => {
                    const alreadyListening = hereNow[
                        sendChannel
                    ].occupants.some(({ uuid }) => uuid === peerId)
                    if (alreadyListening) {
                        whenListening()
                    } else {
                        console.log(
                            `waiting for a connection to ${sendChannel}...`
                        )
                        joinHandlers.set(`${sendChannel}`, whenListening)
                    }
                })
        }
        connectWhenReady()
    })
}
