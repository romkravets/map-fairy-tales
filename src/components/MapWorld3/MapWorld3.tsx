'use client'
import React, { FC, useId, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { useRouter } from 'next/navigation'

import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";

import { FaPlus, FaMinus } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";

const geoUrl = "/features.json";

interface MapWorld2Props {
  modal: boolean;
  setModal: (value: boolean) => void;
  setRegionData: (data: { region: string; value: number; votes?: []; regionVotes?: number }) => void;
  regionData: { region?: string; regionVotes?: number };
  usersVoting: Record<string, number>;
  loadingMapApp: boolean;
}

const MapWorld3: FC<MapWorld2Props> = ({
         setModal,
         setRegionData,
         regionData,
         usersVoting,
         loadingMapApp,
       }) => {

  const router = useRouter()


  const handleClick = (geo: any) => () => {
    const region = geo.properties.name;
    const id = geo.id;
    console.log(region, id)
    router.push(`/country?region=${region}&id=${id}`)
  };

  return (
    <>
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147,
        }}
        width={800}
        height={400}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const regionCode = geo.id;
                //const voteValue = usersVoting[regionCode] || 0;
                return (
                  <Geography
                    key={regionCode}
                    geography={geo}
                    fill={"grey"}
                    onClick={handleClick(geo)}
                    //onMouseEnter={(event) => handleMouseEnter(geo, event)}
                    //onMouseLeave={handleMouseLeave}
                    style={{
                      default: {
                        outline: "none",
                        cursor: "pointer"
                      },
                      hover: {
                        outline: "none",
                        fill: "#eae4e2",
                        cursor: "pointer"
                      },
                      pressed: {
                        outline: "none",
                        fill: "#E42",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </>
  );
};

export default MapWorld3;
