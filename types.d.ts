declare module "*.geo.json" {
  const value: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      properties: {
        ADMIN: string;
        [key: string]: any;
      };
      geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: any;
      };
    }[];
  };
  export default value;
}
