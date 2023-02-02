import { Direct, MetalitixLogger, UserInteractionTypes } from "./metalitix-logger/MetalitixLogger"

const logger = new MetalitixLogger("b81704bf-1f4b-4f42-a820-eee4a844c218"); 

let myEntity = new Entity();
let sphere = new SphereShape()
myEntity.addComponent(sphere)

logger.setCustomField("CustomField1", "CustomField1Value-" + Math.floor(Math.random() * 3))

myEntity.addComponent(new OnPointerDown((e) => {
  logger.logEvent({
    eventName: "ClickEvent",
    eventType: UserInteractionTypes.MouseDown,
    params: {
      origin: e.origin,
    }
  })
}))

engine.addEntity(myEntity)

logger.startSesttion();
