/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import { useEffect } from "react"

const BootstrapClient = () => {
    useEffect(() => {
        import("bootstrap/dist/js/bootstrap.bundle.min.js")
    })
    return null
}


export default BootstrapClient