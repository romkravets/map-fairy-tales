import { json, csv } from 'd3-fetch';
import { scaleLinear } from "d3-scale"
import {serverTimestamp} from "firebase/database"

import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule
} from "react-simple-maps"

const geoUrl = "/features.json";

const MapWorld2 = ({setModal, setRegionData, regionData, usersVoting, loadingMapApp}) => {

  // useEffect(() => {
  //   csv(`/vulnerability.csv`).then((data) => {
  //     setData(data);
  //   });
  // }, []);

  const handleClick = (geo) => () => {
    const region = geo.id;
    const regionVotes = usersVoting[region] || 0;
    setModal(true);
    setRegionData({ ...regionData, region, regionVotes });
  };


  const setColorRegions = (value) => {
    if (value === undefined) return;
    const colorScale = scaleLinear()
      .domain([1, 2, 3])
      .range(["#cc3333", "#cccc33", "#33cc33"]);
    return colorScale(value);
  };

  const width = 40
  const height = 40
  const mapImage = 'mapImage'
  const x = "0"
  const y = "0"

  return (
    <ComposableMap
      projectionConfig={{
        rotate: [-10, 0, 0],
        scale: 147
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
                    }
                  }}
                />
              );
            })
          }
          {/*{({ geographies }) =>*/}
          {/*  geographies.map((geo) => {*/}
          {/*  const provinceCenter = geoCentroid(geo);*/}
          {/*  return (*/}
          {/*    <Marker key={geo.rsmKey} coordinates={provinceCenter}>*/}
          {/*      <text>{geo.properties.VARNAME_1}</text>*/}
          {/*    </Marker>*/}
          {/*  );*/}
          {/*})}*/}
        </Geographies>
      {/*{hoveredName && (*/}
      {/*  <Marker coordinates={markerCoordinates}>*/}
      {/*    <text textAnchor="middle" fill="#000" fontSize="5px">*/}
      {/*      {hoveredName}*/}
      {/*    </text>*/}
      {/*  </Marker>*/}
      {/*)}*/}
    </ComposableMap>
  );

}

export default MapWorld2
