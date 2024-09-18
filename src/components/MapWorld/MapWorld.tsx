"use client";

import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useRouter } from 'next/navigation';

const geoUrl = "/features.json";

const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 20;
  const lightness = 85 + Math.random() * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

const MapWorld = () => {
  const router = useRouter();

  const [colors, setColors] = useState<{ [key: string]: string }>({});
  const [loadingMap, setLoadingMap] = useState(false);

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
    <div className="map-container">
    <ComposableMap
      projectionConfig={{
        rotate: [-10, 0, 0],
        scale: 147,
        center: [0, -10]
      }}
    >
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
                      stroke: "#FF80AB",
                      strokeWidth: 0.5
                    },
                    hover: {
                      outline: "none",
                      fill: "#FFECB3",
                      cursor: "pointer",
                    },
                    pressed: {
                      outline: "none",
                      fill: "#FFC107",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
    </ComposableMap>
    </div>
  );
};

export default MapWorld;
