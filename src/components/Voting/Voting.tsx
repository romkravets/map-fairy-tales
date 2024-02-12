
export default function Voting({regionData, setRegionData, getFormApp, setCheckIfSetValue}) {
  let setValueData = (valueToUpdate) => {
    const updatedRegionData = { ...regionData };
    updatedRegionData.value = {
      1: 0,
      2: 0,
      3: 0,
      4: 0
    };

    updatedRegionData.value = {
      ...updatedRegionData.value,
      ...valueToUpdate
    };
    setRegionData(updatedRegionData);
  };

  return (
    <main className="voutingName">
      <button onClick={() => {
        setCheckIfSetValue(false)
        getFormApp(regionData.region)
        setValueData( {1: 1});
      }}>1</button>
      <button onClick={() => {
        setCheckIfSetValue(false)
        getFormApp(regionData.region)
        setValueData( {2: 1});
      }}>2</button>
      <button onClick={() => {
        setCheckIfSetValue(false)
        getFormApp(regionData.region)
        setValueData( {3: 1});
      }}>3</button>
      <button onClick={() => {
        setCheckIfSetValue(false)
        getFormApp(regionData.region)
        setValueData( {4: 1});
      }}>4</button>
    </main>
  );
}
