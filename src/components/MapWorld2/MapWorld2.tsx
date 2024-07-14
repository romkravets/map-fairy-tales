import React from 'react';
import { scaleLinear } from "d3-scale";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
} from "react-simple-maps";

const geoUrl = "/features.json";

interface MapWorld2Props {
  setModal: (value: boolean) => void;
  setRegionData: (data: { region?: string; regionVotes?: number }) => void;
  regionData: { region?: string; regionVotes?: number };
  usersVoting: Record<string, number>;
  loadingMapApp: boolean;
}

const MapWorld2: React.FC<MapWorld2Props> = ({
     setModal,
     setRegionData,
     regionData,
     usersVoting,
     loadingMapApp,
   }) => {

  const handleClick = (geo: any) => () => {
    const region = geo.id;
    const regionVotes = usersVoting[region] || 0;
    setModal(true);
    setRegionData({ ...regionData, region, regionVotes });
  };

  const setColorRegions = (value: number | undefined) => {
    if (value === undefined) return;
    const colorScale = scaleLinear()
      .domain([0, 1.5, 3])
      .range(["#cc3333", "#cccc33", "#33cc33"]);
    return colorScale(value);
  };

  return (
    <ComposableMap
      projectionConfig={{
        rotate: [-10, 0, 0],
        scale: 147,
      }}
    >
      <Sphere stroke="#E4E5E6" strokeWidth={0.6} />
      <Graticule stroke="#E4E5E6" strokeWidth={0.6} />
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
                style={{
                  default: { outline: "none" },
                  hover: {
                    outline: "none",
                    fill: "#eae4e2",
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
    </ComposableMap>
  );
};

export default MapWorld2;
