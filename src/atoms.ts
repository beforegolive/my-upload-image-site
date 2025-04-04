// src/atoms.ts
import { atom } from "jotai";
import { Image } from "./types";

export const uploadedImagesAtom = atom<Image[]>([]);
