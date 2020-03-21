import React, { FunctionComponent, useState } from "react"

interface LoginProps {
    onCreateUser: (userName: string) => void
}

export const Login: FunctionComponent<LoginProps> = ({ onCreateUser }) => {
    const [userName, setUserName] = useState<string>("")
    return (
        <form
            id="login"
            onSubmit={e => {
                e.preventDefault()
                onCreateUser(userName!)
            }}
        >
            <fieldset>
                <label htmlFor="user-name">Enter your name</label>
                <input
                    id="user-name"
                    placeholder="Fred"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                />
            </fieldset>
            <button disabled={!userName}>Start</button>
        </form>
    )
}
