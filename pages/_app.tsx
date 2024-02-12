import type { AppProps } from 'next/app'
import { createContext, useState, useMemo } from 'react'
import Context from "../context/context"



export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Context>
        <Component {...pageProps} />
      </Context>
    </>
  )
}
