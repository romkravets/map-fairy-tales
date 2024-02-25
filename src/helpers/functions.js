import {regions} from "../helpers/regionType"
import {regionsTranslate} from "../helpers/regionTranslate"

export const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

export const validation = (data) => {
  if (data.length === 0) {
    return 'Поле не може бути пустим...'
  } else {
    return ''
  }
  if (data.length >= 20) {
    return 'Занадто багато символів в бажанні...'
  } else {
    return ''
  }
}


export const translateRegionNameToUkrainian = (regionName) => {
  const index = regions.indexOf(regionName)
  if (index !== -1) {
    return regionsTranslate[index]
  } else {
    return 'Translation Not Found'
  }
}


