import geography from "../../data/processed/india-admin1.json" with { type: "json" };
import states from "../../data/content/states.json" with { type: "json" };

// Current public names override historical geography labels without altering source data.
const namesById = new Map(states.map(state => [state.id, state.names]));
const adminData = {
  ...geography,
  features: geography.features.map(feature => {
    const names = namesById.get(feature.properties.iso_3166_2);
    return { ...feature, properties: { ...feature.properties,
      ...(names?.ko ? { name_ko: names.ko } : {}),
      ...(names?.en ? { name: names.en, name_en: names.en } : {}),
      ...(names?.hi ? { name_hi: names.hi } : {}),
    } };
  }),
};
export default adminData;
