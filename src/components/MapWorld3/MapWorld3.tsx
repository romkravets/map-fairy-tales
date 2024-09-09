"use client";

import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Graticule, Sphere } from "react-simple-maps";
import { useRouter } from 'next/navigation';

const geoUrl = "/features.json";

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

interface GeoProperties {
  name: string;
}

interface GeoType {
  properties: GeoProperties;
}

interface DataType {
  objects: {
    world: {
      geometries: GeoType[];
    };
  };
}

const MapWorld3 = () => {
  const router = useRouter();

  const [colors, setColors] = useState<{ [key: string]: string }>({});

  const handleClick = (region: string, id: string) => () => {
    console.log(region, id);
    router.push(`/stories?region=${region}&id=${id}`);
  };

  const getColorCountries = (newColors: { [key: string]: string }, regionName: string) => {
    newColors[regionName] = getRandomColor();
    setColors({ ...newColors });
  };

  useEffect(() => {
    const countRandomColor = 3;
    fetch(geoUrl)
      .then((response) => response.json())
      .then((data: DataType) => {
        const newColors: { [key: string]: string } = {};
        data.objects?.world?.geometries.forEach((geo: GeoType) => {
          const regionName = geo.properties.name;
          getColorCountries(newColors, regionName);
          for (let i = 1; i <= countRandomColor; i++) {
            setTimeout(() => {
              getColorCountries(newColors, regionName);
            }, 1000 * i);
          }
        });
      });
  }, []);

  return (
    <ComposableMap
      projectionConfig={{
        rotate: [-10, 0, 0],
        scale: 147,
        center: [0, -30]
      }}
      style={{ backgroundColor: "#F0F8FF" }}
    >
      <Sphere stroke="#E4E5E6" strokeWidth={0.6} id='1' fill='#87CEEB' />
      <Graticule stroke="#E4E5E6" strokeWidth={0.6} id='2' fill='#87CEEB' />
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
                  onClick={handleClick(regionName, geo.id)}
                  style={{
                    default: {
                      outline: "none",
                      cursor: "pointer",
                    },
                    hover: {
                      outline: "none",
                      fill: "gold",
                      cursor: "pointer",
                    },
                    pressed: {
                      outline: "none",
                      fill: "#1E90FF",
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

export default MapWorld3;
