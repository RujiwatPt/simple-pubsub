// interfaces
export interface IEvent {
  type(): string;
  machineId(): string;
}

export interface ISubscriber {
  handle(event: IEvent): void;
}

export interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: string, handler: ISubscriber): void;
  unsubscribe(type: string, handler: ISubscriber): void;
}

// event classes
export class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return "lowStockWarning";
  }
}

export class StockLevelOkEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return "stockLevelOk";
  }
}

export class MachineSaleEvent implements IEvent {
  constructor(
    private readonly _sold: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold;
  }

  type(): string {
    return "sale";
  }
}

export class MachineRefillEvent implements IEvent {
  constructor(
    private readonly _refill: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  getRefillQuantity(): number {
    return this._refill;
  }

  type(): string {
    return "refill";
  }
}

// Machine class
export class Machine {
  public stockLevel = 10;
  public id: string;
  public isLowStock = false;

  constructor(id: string) {
    this.id = id;
  }
}

// PubSub service implementation
export class PublishSubscribeService implements IPublishSubscribeService {
  private subscribers: { [key: string]: ISubscriber[] } = {};

  publish(event: IEvent): void {
    const eventType = event.type();
    const handlers = this.subscribers[eventType] || [];
    handlers.forEach((handler) => handler.handle(event));
  }

  subscribe(type: string, handler: ISubscriber): void {
    if (!this.subscribers[type]) {
      this.subscribers[type] = [];
    }
    this.subscribers[type].push(handler);
  }

  unsubscribe(type: string, handler: ISubscriber): void {
    const handlers = this.subscribers[type];
    if (handlers) {
      this.subscribers[type] = handlers.filter((h) => h !== handler);
    }
  }
}

export const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return "001";
  } else if (random < 2) {
    return "002";
  }
  return "003";
};

export const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};
