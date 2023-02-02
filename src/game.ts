import {
  MetalitixLogger,
  UserInteractionTypes,
} from "./metalitix-logger/MetalitixLogger";

const logger = new MetalitixLogger("f4b9686c-b8ea-493c-8f2d-8eabe6bc93fe");
logger.setCustomField(
  "CustomField1",
  "CustomField1Value-" + Math.floor(Math.random() * 4)
);

let myEntity = new Entity();
let sphere = new SphereShape();
myEntity.addComponent(sphere);

myEntity.addComponent(
  new OnPointerDown((e) => {
    logger.logEvent({
      eventName: "ClickEvent",
      eventType: UserInteractionTypes.MouseDown,
      params: {
        origin: e.origin,
        dclCustomEvent: "dclCustomValue1",
      },
    });
  })
);

engine.addEntity(myEntity);

const myCube = new Entity();
myCube.addComponent(
  new Transform({ position: new Vector3(8, 1, 8), scale: new Vector3(2, 2, 2) })
);
myCube.addComponent(new PlaneShape());
engine.addEntity(myCube);

logger.startSesttion();
