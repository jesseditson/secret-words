import React, { FunctionComponent, useRef, useEffect } from "react"
import { User } from "../lib/types"
import PubNub from "pubnub"
import Peer from "simple-peer"
import "./video-chat.scss"

interface VideoChatProps {
    user: User
    players: User[]
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
            console.log(channel, peerMessageHandlers.has(channel))
            if (peerMessageHandlers.has(channel)) {
                peerMessageHandlers.get(channel)!(message)
            }
        }
    })
}

const remoteTracks: Map<string, MediaStream> = new Map()
const setupVideoChat = async (userId: string, peers: User[]) => {
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
    peers.forEach(peer => {
        console.log(peer._id, userId)
        if (peer._id === userId) {
            return
        }
        const localPeer = new Peer({ initiator: true, stream })
        const channel = `${userId}->${peer._id}`
        const sendMessage = (message: any) => {
            console.log("sending to ", channel)
            pubnub.publish({
                channel,
                message
            })
        }
        localPeer.on("signal", data => {
            setTimeout(() => sendMessage(data), 5000)
        })
        console.log("sub", `${peer._id}->${userId}`)
        peerMessageHandlers.set(`${peer._id}->${userId}`, data => {
            console.log(data)
            localPeer.signal(data)
        })

        localPeer.on("connect", () => {
            console.log("connected")
        })

        localPeer.on("stream", (stream: MediaStream) => {
            remoteTracks.set(peer._id, stream)
            const element = document.getElementById(
                `video-${peer._id}`
            ) as HTMLVideoElement
            if (element && !element.srcObject) {
                element.srcObject = stream
            }
        })
    })
    pubnub.subscribe({
        channels: peers.reduce((channels: string[], peer) => {
            // channels.push(`${userId}->${peer._id}`)
            channels.push(`${peer._id}->${userId}`)
            return channels
        }, [])
    })
}

export const VideoChat: FunctionComponent<VideoChatProps> = ({
    user,
    players
}) => {
    useEffect(() => {
        setupPubNub(user._id)
        setupVideoChat(user._id, players)
    }, [])
    const setVideoEl = (id: string, ref: HTMLVideoElement | null) => {
        const remoteTrack = remoteTracks.get(id)
        if (ref && remoteTrack && !ref.srcObject) {
            ref.srcObject = remoteTrack
        }
    }
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const videoWidth = `${100 / players.length}%`
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
                {players
                    .filter(u => u._id !== user._id)
                    .map(user => (
                        <div
                            className="video"
                            key={user._id}
                            style={{ width: videoWidth }}
                        >
                            <video
                                id={`video-${user._id}`}
                                ref={ref => setVideoEl(user._id, ref)}
                                autoPlay
                            />
                        </div>
                    ))}
            </div>
        </div>
    )
}
