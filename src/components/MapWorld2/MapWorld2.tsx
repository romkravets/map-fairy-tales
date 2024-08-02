import React, { FC, useId, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";

import { FaPlus, FaMinus } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { Tooltip as ReactTooltip } from 'react-tooltip'

const geoUrl = "/features.json";

interface MapWorld2Props {
  modal: boolean;
  setModal: (value: boolean) => void;
  setRegionData: (data: { region: string; value: number; votes?: []; regionVotes?: number }) => void;
  regionData: { region?: string; regionVotes?: number };
  usersVoting: Record<string, number>;
  loadingMapApp: boolean;
}

const MapWorld2: FC<MapWorld2Props> = ({
                                         setModal,
                                         setRegionData,
                                         regionData,
                                         usersVoting,
                                         loadingMapApp,
                                       }) => {
  const id = useId();
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipVisibility, setTooltipVisibility] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]); // Initial center coordinates
  const shadow_custom_world_map = "shadow-md";

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.2, 10));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.2, 1));
  const handleCenter = (lat: number, lon: number) => {
    setCenter([lat, lon]);
  };

  const handleClick = (geo: any) => () => {
    const region = geo.id;
    const regionVotes = usersVoting[region] || 0;
    setModal(true);
    const value = 0;
    setRegionData({ ...regionData, region, regionVotes, value });
  };

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const { clientX, clientY } = event;
    setTooltipContent(`${geo.properties.name} - Votes: ${usersVoting[geo.id] || 0}`);
    setTooltipPosition({ top: clientY, left: clientX });
    setTooltipVisibility(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisibility(false);
  };

  const setColorRegions = (value: number | undefined) => {
    if (value === undefined) return;
    const colorScale = scaleLinear<string, string>()
      .domain([0, 1.5, 3])
      .range(["#cc3333", "#cccc33", "#33cc33"]);
    return colorScale(value);
  };

  return (
    <>
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147,
          center
        }}
      >
        <ZoomableGroup zoom={zoomLevel}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const regionCode = geo.id;
                const voteValue = usersVoting[regionCode] || 0;
                return (
                  <Geography
                    key={regionCode}
                    geography={geo}
                    fill={voteValue ? setColorRegions(voteValue) : "#FFF"}
                    onClick={handleClick(geo)}
                    onMouseEnter={(event) => handleMouseEnter(geo, event)}
                    onMouseLeave={handleMouseLeave}
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

      {/*{tooltipVisibility && (*/}
      {/*  <ReactTooltip*/}
      {/*    id={id}*/}
      {/*    effect="float"*/}
      {/*    className={`p-0 rounded-lg bg-white text-inherit ${shadow_custom_world_map} select-none z-10`}*/}
      {/*    style={{ top: tooltipPosition.top, left: tooltipPosition.left, position: 'absolute' }}*/}
      {/*    opacity={1}*/}
      {/*  >*/}
      {/*    <div className="flex gap-x-5">*/}
      {/*      <div className="flex justify-center items-center">*/}
      {/*        <p className="font-primary-Regular font-bold">{tooltipContent}</p>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </ReactTooltip>*/}
      {/*)}*/}

      {/* Zoom in-out 🔍🔎 */}
      <div className="absolute right-0 bottom-0">
        <div
          className={`bg-white rounded-lg p-2 mx-3 my-1 ${shadow_custom_world_map}`}
        >
          <button
            className="block p-1 pb-2"
            title="zoom in"
            type="button"
            onClick={handleZoomIn}
          >
            <FaPlus fill="#000"/>
          </button>
          <button
            className="block p-1 pt-2"
            title="zoom out"
            type="button"
            onClick={handleZoomOut}
          >
            <FaMinus fill="#000" />
          </button>
        </div>

        <button
          title="center"
          type="button"
          onClick={() => handleCenter(0, -30)}
          className={`p-3 mx-3 mt-1 mb-2 bg-white rounded-lg float-right ${shadow_custom_world_map}`}
        >
          <BiTargetLock fill="#000"/>
        </button>
      </div>
    </>
  );
};

export default MapWorld2;
