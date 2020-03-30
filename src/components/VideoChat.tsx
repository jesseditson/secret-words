import React, { FunctionComponent, useRef, useEffect } from "react"
import "./video-chat.scss"
import { connectToPeer, Connection } from "../lib/rtc-connections"

interface VideoChatProps {
    showLocal: boolean
    userId: string
    peerIds: string[]
    initiatorMap: Map<string, boolean>
}

const remoteStreams: Map<string, MediaStream> = new Map()
const peerConnections: Map<string, Connection> = new Map()
let localStream: MediaStream
const setupVideoChat = async () => {
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
    localStream = stream
    peerConnections.forEach(({ peer }) => {
        peer.addStream(stream)
    })
}

const connectToPeers = (
    userId: string,
    peerIds: string[],
    initiatorMap: Map<string, boolean>
) => {
    peerIds.forEach(peerId => {
        if (remoteStreams.has(peerId)) {
            return
        }
        const getElement = () =>
            document.getElementById(`video-${peerId}`) as HTMLVideoElement

        connectToPeer(userId, peerId, initiatorMap.get(peerId)!, () => {
            remoteStreams.delete(peerId)
            const element = getElement()
            if (element && element.srcObject) {
                element.srcObject = null
            }
        })
            .then(connection => {
                if (!remoteStreams.has(peerId)) {
                    connection.peer.on("stream", (stream: MediaStream) => {
                        remoteStreams.set(peerId, stream)
                        const element = getElement()
                        if (element && !element.srcObject) {
                            element.srcObject = stream
                        }
                    })
                    peerConnections.set(peerId, connection)
                    if (localStream) {
                        connection.peer.addStream(localStream)
                    }
                }
            })
            .catch(error => {
                console.error(`connection to ${peerId} failed:`, error.stack)
            })
    })
}

let currentPeers: Set<string> = new Set([])
export const VideoChat: FunctionComponent<VideoChatProps> = ({
    showLocal,
    userId,
    peerIds,
    initiatorMap
}) => {
    useEffect(() => {
        if (showLocal) {
            setupVideoChat()
        }
    }, [showLocal])
    useEffect(() => {
        const newPeers = peerIds
            .filter(pid => !currentPeers.has(pid))
            .map(pid => {
                currentPeers.add(pid)
                return pid
            })
        if (newPeers.length) {
            connectToPeers(userId, newPeers, initiatorMap)
        }
    }, [peerIds])
    const setVideoEl = (id: string, ref: HTMLVideoElement | null) => {
        const remoteStream = remoteStreams.get(id)
        if (ref && remoteStream && !ref.srcObject) {
            ref.srcObject = remoteStream
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
