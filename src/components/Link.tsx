import React, { FunctionComponent } from "react"

interface LinkProps {
    href: string
    onClick: (e: React.MouseEvent) => void
}

export const Link: FunctionComponent<LinkProps> = ({
    children,
    href,
    onClick
}) => (
    <a
        href={href}
        onClick={e => {
            e.preventDefault()
            onClick(e)
            // window.history.pushState({}, "", href)
        }}
    >
        {children}
    </a>
)
