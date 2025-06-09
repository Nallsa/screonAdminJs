import {create} from 'zustand'
import {Property} from "csstype";
import {number} from "prop-types";

interface SvgState {
    isReadySvg: boolean
    setIsReadySvg: (ready: boolean) => void,
}

export const useSvgStore = create<SvgState>((set) => ({
    isReadySvg: false,
    setIsReadySvg: (ready) => set({isReadySvg: ready}),
}))
