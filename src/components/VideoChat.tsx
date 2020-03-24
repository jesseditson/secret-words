import React, { FunctionComponent, useEffect, useRef } from "react"
import { User, Game } from "../lib/types"
import PubNub from "pubnub"
import "./video-chat.scss"

const { RTCPeerConnection } = window

const RTC_CONFIG = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302" // Google's public STUN server
        }
    ]
}

interface VideoChatProps {
    user: User
    users: User[]
    game: Game
}
const activeUsers = new Set()
let pubnub: PubNub
const setupVideoChat = (user: User) => {
    if (pubnub) {
        return
    }
    pubnub = new PubNub({
        publishKey: process.env.PUBNUB_PUB_KEY,
        subscribeKey: process.env.PUBNUB_SUB_KEY!,
        uuid: user._id
    })
    const pc = new RTCPeerConnection(RTC_CONFIG)
    const sendMessage = (message: any) => {
        pubnub.publish({
            channel: user._id,
            message
        })
    }
    pubnub.addListener({
        status: statusEvent => {
            console.log("status event:", statusEvent)
        },
        message: async ({ message }) => {
            console.log("message", message)
            const {
                desc,
                candidate
            }: {
                desc: RTCSessionDescription
                candidate: RTCIceCandidate
            } = message
            try {
                console.log(desc)
                if (desc) {
                    // if we get an offer, we need to reply with an answer
                    if (desc.type === "offer") {
                        await pc.setRemoteDescription(desc)
                        const stream = await navigator.mediaDevices.getUserMedia(
                            { video: true, audio: true }
                        )
                        const localVideo = document.getElementById(
                            "local-video"
                        ) as HTMLVideoElement
                        if (localVideo) {
                            localVideo.srcObject = stream
                        }
                        stream
                            .getTracks()
                            .forEach(track => pc.addTrack(track, stream))
                        await pc.setLocalDescription(await pc.createAnswer())
                        console.log("sending tracks to offer")
                        sendMessage({ desc: pc.localDescription })
                    } else if (desc.type === "answer") {
                        await pc.setRemoteDescription(desc)
                    } else {
                        console.log("Unsupported SDP type.")
                    }
                } else if (candidate) {
                    await pc.addIceCandidate(candidate)
                }
            } catch (err) {
                console.error(err)
            }
        },
        presence: presenceEvent => {
            console.log("presence event:", presenceEvent)
        }
    })

    navigator.getUserMedia(
        { video: true, audio: false },
        stream => {
            const localVideo = document.getElementById(
                "local-video"
            ) as HTMLVideoElement
            if (localVideo) {
                localVideo.srcObject = stream
            }
            stream.getTracks().forEach(track => pc.addTrack(track, stream))
        },
        error => {
            console.warn(error.message)
        }
    )
}

export const VideoChat: FunctionComponent<VideoChatProps> = ({
    user,
    users,
    game
}) => {
    useEffect(() => {
        setupVideoChat(user)
        const newUsers: string[] = []
        for (const user of users) {
            if (activeUsers.has(user._id)) {
                return
            }
            const userVideo = document.getElementById(
                `video-${user._id}`
            ) as HTMLVideoElement
            const pc = new RTCPeerConnection(RTC_CONFIG)
            const sendMessage = (message: any) => {
                console.log(user._id, message)
                pubnub.publish({
                    channel: user._id,
                    message
                })
            }
            // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
            // message to the other peer through the signaling server
            pc.onicecandidate = event => {
                if (event.candidate) {
                    sendMessage({ candidate: event.candidate })
                }
            }
            // let the "negotiationneeded" event trigger offer generation
            pc.onnegotiationneeded = async () => {
                try {
                    await pc.setLocalDescription(await pc.createOffer())
                    // send the offer to the other peer
                    sendMessage({ desc: pc.localDescription })
                } catch (err) {
                    console.error(err)
                }
            }
            // once remote track media arrives, show it in remote video element
            pc.ontrack = event => {
                // don't set srcObject again if it is already set.
                if (userVideo.srcObject) return
                userVideo.srcObject = event.streams[0]
            }
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    // send the offer to the other peer
                    sendMessage({ desc: pc.localDescription })
                })
                .catch(e => console.error(e))
            activeUsers.add(user._id)
            newUsers.push(user._id)
        }
        console.log(newUsers)
        // subscribe to any messages for these users
        pubnub.subscribe({
            channels: newUsers
        })
    }, [users])
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const videoWidth = `${100 / users.length}%`
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
                {users
                    .filter(u => u._id !== user._id)
                    .map(user => (
                        <div
                            className="video"
                            key={user._id}
                            style={{ width: videoWidth }}
                        >
                            <video id={`video-${user._id}`} autoPlay />
                        </div>
                    ))}
            </div>
        </div>
    )
}
