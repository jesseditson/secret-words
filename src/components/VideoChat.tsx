import React, { FunctionComponent, useRef, useEffect } from "react"
import { User } from "../lib/types"
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
        const peer = new Peer({ initiator: true, stream })
        const channel = `${userId}->${peerId}`
        const sendMessage = (message: any) => {
            pubnub.publish({
                channel,
                message
            })
        }
        let signals: any[] = []
        let connected = false
        peer.on("signal", data => {
            signals.push(data)
        })
        const connectInterval = setInterval(
            () => sendMessage("connected"),
            1000
        )
        peerMessageHandlers.set(`${peerId}->${userId}`, data => {
            if (data === "connected") {
                console.log("got connection from ", peerId)
                if (!connected) {
                    console.log(connected)
                    clearInterval(connectInterval)
                    connected = true
                    signals.forEach(data => {
                        sendMessage(data)
                    })
                    signals = []
                }
            } else {
                console.log("got signal", peer)
                peer.signal(data)
            }
        })

        peer.on("connect", () => {
            console.log("connected")
        })

        peer.on("stream", (stream: MediaStream) => {
            remoteTracks.set(peerId, stream)
            const element = document.getElementById(
                `video-${peerId}`
            ) as HTMLVideoElement
            if (element && !element.srcObject) {
                element.srcObject = stream
            }
        })
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
