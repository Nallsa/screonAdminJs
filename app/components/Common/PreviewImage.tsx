/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import React, {useState} from 'react'
import Image from 'next/image'
import {SERVER_URL} from '@/app/API/api'

interface PreviewImageProps {
    id: string
    name: string
    fill?: boolean
    aspectRatio?: number
    width?: number
    height?: number
    fallbackSrc?: string
}

export default function PreviewImage({
                                         id,
                                         name,
                                         fill = false,
                                         aspectRatio = 16 / 9,
                                         width = 40,
                                         height = 40,
                                         fallbackSrc = '/assets/default-thumbnail.svg',
                                     }: PreviewImageProps) {
    const [errored, setErrored] = useState(false)
    const src = errored
        ? fallbackSrc
        : `${SERVER_URL}files/${id}/preview`

    if (fill) {
        const paddingTop = 100 / aspectRatio
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: `${paddingTop}%`,
                    backgroundColor: '#000',
                }}
            >
                <Image
                    src={src}
                    alt={name}
                    fill
                    style={{
                        objectFit: errored ? 'contain' : 'cover'
                    }}
                    onError={() => setErrored(true)}
                    unoptimized
                />
            </div>
        )
    }

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
                flex: '0 0 auto',
                marginRight: 8,
                backgroundColor: '#000',
            }}
        >
            <Image
                src={src}
                alt={name}
                fill
                style={{
                    objectFit: errored ? 'contain' : 'cover'
                }}
                onError={() => setErrored(true)}
                unoptimized
            />
        </div>
    )
}
