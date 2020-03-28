import React, {
    FunctionComponent,
    useEffect,
    useRef,
    useLayoutEffect
} from "react"
import { User, Game } from "../lib/types"
import PubNub from "pubnub"
import "./video-chat.scss"

interface VideoChatProps {
    user: User
    users: User[]
    game: Game
}

const { RTCPeerConnection } = window
const RTC_CONFIG = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302" // Google's public STUN server
        }
    ]
}

let pubnub: PubNub
const listeningUsers: Set<string> = new Set()
const connections: Map<string, RTCPeerConnection> = new Map()
const remoteTracks: Map<string, readonly MediaStream[]> = new Map()
const peerMessageHandlers: Map<
    string,
    (message: any) => Promise<void>
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
const connectToPeer = (userId: string, peerId: string): RTCPeerConnection => {
    const channel = `${peerId}->${userId}`
    const sendMessage = (message: any) => {
        pubnub.publish({
            channel,
            message
        })
    }
    if (!connections.has(channel)) {
        connections.set(channel, new RTCPeerConnection(RTC_CONFIG))
    }
    const pc = connections.get(channel)!
    if (peerMessageHandlers.has(channel)) {
        return pc
    }
    peerMessageHandlers.set(channel, async message => {
        const {
            desc,
            candidate
        }: {
            desc: RTCSessionDescription
            candidate: RTCIceCandidate
        } = message
        try {
            if (desc) {
                // if we get an offer, we need to reply with an answer
                if (desc.type === "offer") {
                    console.log(channel, "offer")
                    await pc.setRemoteDescription(desc)
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    })
                    stream
                        .getTracks()
                        .forEach(track => pc.addTrack(track, stream))
                    await pc.setLocalDescription(await pc.createAnswer())
                    console.log(channel, "sending local desc")
                    sendMessage({ desc: pc.localDescription })
                } else if (desc.type === "answer") {
                    console.log(channel, "got answer")
                    await pc.setRemoteDescription(desc)
                } else {
                    console.log("Unsupported SDP type.")
                }
            } else if (candidate) {
                console.log(channel, "got ice candidate", candidate)
                await pc.addIceCandidate(candidate)
            }
        } catch (err) {
            console.error(err)
        }
    })
    return pc
}
const setupLocalVideo = () => {
    navigator.getUserMedia(
        { video: true, audio: false },
        stream => {
            const localVideo = document.getElementById(
                "local-video"
            ) as HTMLVideoElement
            if (localVideo && !localVideo.srcObject) {
                localVideo.srcObject = stream
            }
            const localTracks = stream.getTracks()
            connections.forEach(pc => {
                localTracks.forEach(track => pc.addTrack(track, stream))
            })
        },
        error => {
            console.warn(error.message)
        }
    )
}

const setupVideoChat = (user: User, peers: User[]) => {
    setupPubNub(user._id)
    setupLocalVideo()
    const newUsers: string[] = []
    peers.forEach(peer => {
        if (peer._id === user._id || listeningUsers.has(peer._id)) {
            return
        }
        const pc = connectToPeer(user._id, peer._id)
        const channel = `${user._id}->${peer._id}`
        const sendMessage = (message: any) => {
            pubnub.publish({
                channel,
                message
            })
        }
        // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
        // message to the other peer through the signaling server
        pc.onicecandidate = event => {
            if (event.candidate) {
                console.log(peer._id, "sending ice candidate")
                sendMessage({ candidate: event.candidate })
            }
        }
        // let the "negotiationneeded" event trigger offer generation
        pc.onnegotiationneeded = async () => {
            console.log("negotiate", peer._id)
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
            console.log(peer._id, "got track")
            remoteTracks.set(peer._id, event.streams)
        }
        console.log(peer.name, peer._id, "create offer")
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                // send the offer to the other peer
                sendMessage({ desc: pc.localDescription })
            })
            .catch(e => console.error(e))
        newUsers.push(peer._id)
        listeningUsers.add(peer._id)
    })
    if (newUsers.length) {
        // subscribe to any messages for these users
        pubnub.subscribe({
            channels: newUsers.reduce((channels: string[], peerId) => {
                channels.push(`${user._id}->${peerId}`)
                channels.push(`${peerId}->${user._id}`)
                return channels
            }, [])
        })
    }
}

export const VideoChat: FunctionComponent<VideoChatProps> = ({
    user,
    users,
    game
}) => {
    setupVideoChat(user, users)
    useLayoutEffect(() => {
        for (const [id, tracks] of remoteTracks) {
            const element = document.getElementById(
                `video-${id}`
            ) as HTMLVideoElement
            if (element) {
                element.srcObject = tracks[0]
            }
        }
    })
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
