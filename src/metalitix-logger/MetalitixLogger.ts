import { getPlatform, Platform } from "@decentraland/EnvironmentAPI";
import { getUserData } from "@decentraland/Identity";

interface IMetadataSystemInfo {
  deviceType?: string;
}

interface IUserCamera {
  fieldOfView?: number;
  aspectRatio?: number;
  zNearPlane?: number;
  zFarPlane?: number;
}

interface IUserMetadata {
  systemInfo: IMetadataSystemInfo;
  params: object;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface IEventData {
  eventName: string;
  params: object;
  eventType: UserInteractionTypes | string;
}
enum RecordTypes {
  UserPosition = "event.user.position",
  UserInteraction = "event.user.interaction",
  SessionStart = "event.session.start",
  SessionUpdate = "event.session.update",
  SessionEnd = "event.session.end",
}

export enum Direct {
  dev,
  stage,
  prod,
}

export enum UserInteractionTypes {
  KeyDown = "user.interaction.key_down",
  KeyPress = "user.interaction.key_press",
  KeyUp = "user.interaction.key_down",
  MouseEnter = "user.interaction.mouse_enter",
  MouseLeave = "user.interaction.mouse_leave",
  MouseOver = "user.interaction.mouse_over",
  MouseOut = "user.interaction.mouse_out",
  MouseDown = "user.interaction.mouse_down",
  MouseUp = "user.interaction.mouse_up",
  MouseMove = "user.interaction.mouse_move",
  MousePress = "user.interaction.mouse_press",
  TouchTap = "user.interaction.touch_tap",
  TouchStart = "user.interaction.touch_start",
  TouchMove = "user.interaction.touch_move",
  TouchEnd = "user.interaction.touch_end",
  ZoomStart = "user.interaction.zoom_start",
  ZoomUpdate = "user.interaction.zoom_update",
  ZoomEnd = "user.interaction.zoom_end",
}

interface IMtxPostBody {
  object: string;
  eventType: RecordTypes;
  sessionId: string | null;
  appkey: string;
  timestamp: string;
  data: {
    userId: string | null;
    hasConnectedWeb3: boolean | null;
    position?: { x: number; y: number; z: number };
    direction?: { x: number; y: number; z: number };
    local: true;
    [key: string]: any;
  };
  apiver: string;
  metrics?: {
    fps?: number;
  };
  userMeta: Partial<IUserMetadata>;
  camera: IUserCamera;
  [key: string]: any;
  userEvent: IEventData | undefined;
}
export class MetalitixLogger {
  private sessionId: string | null = null;
  private apiver = "v2";
  private lastTimeListener?: ISystem;
  private direct_path: string = "https://app.metalitix.com/";
  private direct: Direct = Direct.dev;
  private userId: string | null = null;
  private customFields: {
    [key: string]: any;
  } = {};
  private hasConnectedWeb3: boolean | null = null;
  private userMetadata: Partial<IUserMetadata> = {
    systemInfo: {},
  };
  private records_to_send: IMtxPostBody[] = [];
  private interval: number = 0.5;

  constructor(private appKey: string) {
    this.setUpDirect();
  }

  private setUpDirect() {
    if (this.direct == Direct.dev) {
      this.direct_path = "https://metalitix-dev.aircards.io/";
    } else if (this.direct == Direct.stage) {
      this.direct_path = "https://metalitix-staging.aircards.io/";
    } else {
      this.direct_path = "https://app.metalitix.com/";
    }
  }

  ComputeRecordData(
    recordType: RecordTypes,
    additionalData?: {
      userEvent?: IEventData;
    }
  ): IMtxPostBody {
    let record: IMtxPostBody = {
      object: "xr.analytics.record",
      appkey: this.appKey,
      sessionId: this.sessionId,
      eventType: recordType,
      timestamp: new Date().toISOString(),
      data: {
        userId: this.userId,
        hasConnectedWeb3: this.hasConnectedWeb3,
        position: {
          x: Camera.instance.worldPosition.clone().z,
          y: Camera.instance.worldPosition.clone().y,
          z: Camera.instance.worldPosition.clone().x,
        },
        direction: {
          x: (Camera.instance.rotation.eulerAngles.x * Math.PI) / 180,
          y: (Camera.instance.rotation.eulerAngles.y * Math.PI) / 180,
          z: (Camera.instance.rotation.eulerAngles.z * Math.PI) / 180,
        },
        local: true,
      },
      apiver: this.apiver,
      userMeta: {},
      camera: {
        fieldOfView: 45,
        aspectRatio: 1.8,
        zNearPlane: 0.01,
        zFarPlane: 2000,
      },
      userEvent:
        additionalData && additionalData.userEvent
          ? additionalData.userEvent
          : undefined,
    };

    for (let i in this.customFields) {
      record.data[i] = this.customFields[i];
    }

    return record;
  }

  private addRecord(recordType: RecordTypes, additionalData?: any) {
    let record = this.ComputeRecordData(recordType, additionalData);

    if (record) this.records_to_send.push(record);
  }

  private ComputeRecordsData() {
    return {
      apiver: this.apiver,
      appkey: this.appKey,
      items: this.records_to_send,
      object: "xr.analytics.batch.records",
    };
  }

  private async sendRecords(force: boolean = false) {
    if (force) {
      fetch(`${this.direct_path}api/v1/xr-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.ComputeRecordsData()),
      });

      this.records_to_send = [];
    }

    if (this.records_to_send.length > 19) {
      fetch(`${this.direct_path}api/v1/xr-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.ComputeRecordsData()),
      });

      this.records_to_send = [];
    }
  }

  public setCustomField(key: string, value: string | boolean | number) {
    this.customFields[key] = value;
  }

  public logEvent(data: IEventData) {
    let record = this.ComputeRecordData(RecordTypes.UserInteraction, {
      userEvent: data,
    });

    if (record) this.records_to_send.push(record);
  }

  public async startSesttion() {
    let timer: number = this.interval;
    this.sessionId = uuid();

    executeTask(async () => {
      let data = await getPlatform();
      if (!this.userMetadata.systemInfo) this.userMetadata.systemInfo = {};
      if (data === Platform.BROWSER) {
        this.userMetadata.systemInfo.deviceType = "BROWSER";
      } else if (data === Platform.DESKTOP) {
        this.userMetadata.systemInfo.deviceType = "DESKTOP";
      }
    });

    getUserData().then((data) => {
      this.hasConnectedWeb3 = data?.hasConnectedWeb3
        ? data?.hasConnectedWeb3
        : null;
      this.userId = data?.userId ? data?.userId : null;
    });

    this.addRecord(RecordTypes.SessionStart);
    await this.sendRecords(true);

    let LoopSystem: ISystem = {
      update: async (dt: number) => {
        timer -= dt;
        if (timer <= 0) {
          this.addRecord(RecordTypes.UserPosition);
          await this.sendRecords();
          timer = this.interval;
        }
      },
    };

    this.lastTimeListener = engine.addSystem(LoopSystem, 1);
  }

  public async endSession() {
    if (this.lastTimeListener) engine.removeSystem(this.lastTimeListener);
    this.addRecord(RecordTypes.SessionEnd);
    await this.sendRecords(true);
  }
}
