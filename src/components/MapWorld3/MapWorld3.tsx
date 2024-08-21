// 'use client'
// import React, {FC, useEffect, useId, useRef, useState} from "react";
// import { scaleLinear } from "d3-scale";
// import { useRouter } from 'next/navigation'
//
// import {
//   ComposableMap,
//   Geographies,
//   Geography,
//   ZoomableGroup,
//   Marker,
//   Annotation,
// } from "react-simple-maps";
// import * as d3 from "d3-geo"; // For calculating the centroid
//
//
// import { FaPlus, FaMinus } from "react-icons/fa6";
// import { BiTargetLock } from "react-icons/bi";
//
// const geoUrl = "/features.json";
//
// const countryImages = [
//   {
//     id: "USA",
//     name: "United States",
//     coordinates: [-100.0, 40.0], // Longitude, Latitude
//     imageUrl: "/assets/map-icon/usa.png", // Path to the image
//   },
//   {
//     id: "UK",
//     name: "United Kingdom",
//     coordinates: [-3.0, 55.0],
//     imageUrl: "/assets/map-icon/usa.png", // Path to the image
//   },
//   // Add more countries as needed
// ];
//
// const MapWorld3 = () => {
//
//   const router = useRouter()
//   const [randomColor, setRandomColor] = useState([])
//
//   const handleClick = (geo: any) => () => {
//     const region = geo.properties.name;
//     const id = geo.id;
//     console.log(region, id)
//     router.push(`/stories?region=${region}&id=${id}`)
//   };
//
//   const getRandomColor = () => {
//     const letters = '0123456789ABCDEF';
//     let color = '#';
//     for (let i = 0; i < 6; i++) {
//       color += letters[Math.floor(Math.random() * 16)];
//     }
//     return color;
//   };
//
//   useEffect(() => {
//     const countRandomColor = 3;
//     setRandomColor(getRandomColor());
//     for (let i = 1; i <= countRandomColor; i++) {
//       setTimeout(() => {
//         setRandomColor(getRandomColor());
//       }, 2000 * i); // Delay increases by 2 seconds each time
//     }
//   }, [])
//
//
//   return (
//     <>
//       <ComposableMap
//         projectionConfig={{
//           rotate: [-10, 0, 0],
//           scale: 147,
//         }}
//         width={800}
//         height={400}
//         style={{ backgroundColor: "#F0F8FF" }}
//       >
//         <ZoomableGroup>
//           <Geographies geography={geoUrl}>
//             {({ geographies }) =>
//               geographies.map((geo) => {
//                 const regionCode = geo.id;
//                 const regionName = geo.properties.name;
//                 const centroid = d3.geoCentroid(geo); // This gi
//                 console.log(regionName, centroid)
//                 //const voteValue = usersVoting[regionCode] || 0;
//                 return (
//                   <React.Fragment key={regionCode}>
//                   <Geography
//                     geography={geo}
//                     fill={randomColor} // Sky Blue color
//                     onClick={handleClick(geo)}
//                     //onMouseEnter={(event) => handleMouseEnter(geo, event)}
//                     //onMouseLeave={handleMouseLeave}
//                     style={{
//                       default: {
//                         outline: "none",
//                         cursor: "pointer"
//                       },
//                       hover: {
//                         outline: "none",
//                         fill: "#6495ED",
//                         cursor: "pointer"
//                       },
//                       pressed: {
//                         outline: "none",
//                         fill: "#1E90FF",
//                       },
//                     }}
//                   >
//                     {/*<Annotation*/}
//                     {/*  subject={centroid}*/}
//                     {/*  dx={-20}*/}
//                     {/*  dy={-10}*/}
//                     {/*  connectorProps={{*/}
//                     {/*    stroke: "#FF5533",*/}
//                     {/*    strokeWidth: 1,*/}
//                     {/*    strokeLinecap: "round",*/}
//                     {/*  }}*/}
//                     {/*>*/}
//                     {/*  <text*/}
//                     {/*    x={4}*/}
//                     {/*    fontSize={10}*/}
//                     {/*    alignmentBaseline="middle"*/}
//                     {/*    fill="#FF5533"*/}
//                     {/*  >*/}
//                     {/*    {regionName}*/}
//                     {/*  </text>*/}
//                     {/*</Annotation>*/}
//                       <Marker
//                         // subject={centroid}
//                         // dx={-20}
//                         // dy={-10}
//                         // connectorProps={{
//                         //   stroke: "#FF5533",
//                         //   strokeWidth: 1,
//                         //   strokeLinecap: "round",
//                         // }}
//                         coordinates={centroid}
//                       >
//                         {/*<rect x={0} y={0} width={200} height={100} fill="#EEE" />*/}
//                         <text
//                           x={4}
//                           fontSize={10}
//                           alignmentBaseline="middle"
//                           fill="#0000"
//                         >
//                           {regionName}
//                         </text>
//                       </Marker>
//                   </Geography>
//                   </React.Fragment>
//                 );
//               })
//             }
//           </Geographies>
//           {/*{countryImages.map(({ id, coordinates, imageUrl }) => (*/}
//           {/*  <Marker key={id} coordinates={coordinates}>*/}
//           {/*    <image*/}
//           {/*      href={imageUrl}*/}
//           {/*      width="20"*/}
//           {/*      height="20"*/}
//           {/*      transform="translate(-10, -10)" // Center the image on the coordinates*/}
//           {/*    />*/}
//           {/*  </Marker>*/}
//           {/*))}*/}
//         </ZoomableGroup>
//       </ComposableMap>
//     </>
//   );
// };
//
// export default MapWorld3;

"use client"

import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

const geoUrl = "/features.json";

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const MapWorld3 = () => {
  const [colors, setColors] = useState({});

  useEffect(() => {
    const countRandomColor = 3;
    fetch(geoUrl)
      .then(response => response.json())
      .then(data => {
        const newColors = {};
        data.objects?.world?.geometries.forEach((geo) => {
          const regionName = geo.properties.name;
          const randomColor = getRandomColor();
          newColors[regionName] = randomColor;
          setColors(newColors);
          for (let i = 1; i <= countRandomColor; i++) {
            setTimeout(() => {
              const randomColor = getRandomColor();
              newColors[regionName] = randomColor;
              setColors(newColors);
            }, 1000 * i);
          }
        });
        //setColors(newColors);
      });
  }, []);

  return (
    <>
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147,
        }}
        width={800}
        height={400}
        style={{ backgroundColor: "#F0F8FF" }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const regionName = geo.properties.name;
                const fillColor = colors[regionName] || "#87CEEB";
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#6495ED" },
                      pressed: { outline: "none", fill: "#1E90FF" },
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
