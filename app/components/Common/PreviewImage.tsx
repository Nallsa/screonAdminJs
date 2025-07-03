import React, {useState} from 'react'
import Image from 'next/image'
import {SERVER_URL} from '@/app/API/api'

interface PreviewImageProps {
    id: string
    name: string
    /** fill = true → аспект-рейтио режим (100% ширины), иначе фикс. */
    fill?: boolean
    /** для fill-режима: соотношение width/height (по умолчанию 16/9) */
    aspectRatio?: number
    /** для фикс-режима: точные размеры */
    width?: number
    height?: number
    /** URL резерва, если сервер вернёт 404 */
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
    // если превьюшка не загрузилась — используем резерв
    const src = errored
        ? fallbackSrc
        : `${SERVER_URL}files/${id}/preview`

    // --- fill-режим (для карточки) ---
    if (fill) {
        // paddingTop в % = (height/width)*100%
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

    // для списка
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
