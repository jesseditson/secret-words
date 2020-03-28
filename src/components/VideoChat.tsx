import React, { FunctionComponent, useRef, useEffect } from "react"
import PubNub from "pubnub"
import Peer from "simple-peer"
import "./video-chat.scss"

interface VideoChatProps {
    userId: string
    peerIds: string[]
}

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

const remoteTracks: Map<string, MediaStream> = new Map()
const setupVideoChat = async (userId: string, peerIds: string[]) => {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    })
    const localVideo = document.getElementById(
        "local-video"
    ) as HTMLVideoElement
    if (localVideo && !localVideo.srcObject) {
        localVideo.srcObject = stream
    }
    console.log("setting up")
    peerIds.forEach(peerId => {
        if (peerId === userId) {
            return
        }
        const sendMessage = (message: any) => {
            pubnub.publish({
                channel: `${userId}->${peerId}`,
                message
            })
        }
        let signals: any[] = []
        let connected = false
        const local = new Peer({ initiator: true, stream, trickle: false })
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

        const connectInterval = setInterval(
            () => sendMessage("connected"),
            1000
        )
        peerMessageHandlers.set(`${peerId}->${userId}`, data => {
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
        local.on("connect", () => {
            clearInterval(connectInterval)
        })

        const getElement = () =>
            document.getElementById(`video-${peerId}`) as HTMLVideoElement
        remote.on("stream", (stream: MediaStream) => {
            remoteTracks.set(peerId, stream)
            const element = getElement()
            if (element && !element.srcObject) {
                element.srcObject = stream
            }
        })

        const removeStream = () => {
            remoteTracks.delete(peerId)
            const element = getElement()
            if (element && element.srcObject) {
                element.srcObject = null
            }
        }
        remote.on("close", removeStream)
        remote.on("error", removeStream)
    })
    pubnub.subscribe({
        channels: peerIds.reduce((channels: string[], peerId) => {
            // channels.push(`${userId}->${peerId}`)
            channels.push(`${peerId}->${userId}`)
            return channels
        }, [])
    })
}

export const VideoChat: FunctionComponent<VideoChatProps> = ({
    userId,
    peerIds
}) => {
    useEffect(() => {
        setupPubNub(userId)
        setupVideoChat(userId, peerIds)
    }, [])
    const setVideoEl = (id: string, ref: HTMLVideoElement | null) => {
        const remoteTrack = remoteTracks.get(id)
        if (ref && remoteTrack && !ref.srcObject) {
            ref.srcObject = remoteTrack
        }
    }
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const videoWidth = `${100 / peerIds.length}%`
    return (
        <div id="video-chat">
            <div
                className="spacer"
                style={{
                    height: videoContainerRef.current?.getBoundingClientRect()
                        .height
                }}
            />
            <div className="videos" ref={videoContainerRef}>
                <div className="video" style={{ width: videoWidth }}>
                    <video id="local-video" autoPlay muted />
                </div>
                {peerIds
                    .filter(id => id !== userId)
                    .map(peerId => (
                        <div
                            className="video"
                            key={peerId}
                            style={{ width: videoWidth }}
                        >
                            <video
                                id={`video-${peerId}`}
                                ref={ref => setVideoEl(peerId, ref)}
                                autoPlay
                            />
                        </div>
                    ))}
            </div>
        </div>
    )
}
