// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: string, handler: ISubscriber): void;
  unsubscribe(type: string, handler: ISubscriber): void;
}

// Machine Repository to manage the machine objects
class MachineRepository {
  private machines: Machine[] = [];

  addMachine(machine: Machine): void {
    this.machines.push(machine);
  }

  findById(machineId: string): Machine | undefined {
    return this.machines.find((m) => m.id === machineId);
  }

  updateMachine(machine: Machine): void {
    const index = this.machines.findIndex((m) => m.id === machine.id);
    if (index > -1) {
      this.machines[index] = machine;
    }
  }
}

// Event classes
class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return "lowStockWarning";
  }
}

class SoldOutWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return "SoldOutWarning";
  }
}

class StockLevelOkEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return "stockLevelOk";
  }
}

class MachineSaleEvent implements IEvent {
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

class MachineRefillEvent implements IEvent {
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

// The new StockWarningSubscriber, listens for low stock and stock level ok events
class StockWarningSubscriber implements ISubscriber {
  handle(event: IEvent): void {
    if (event instanceof LowStockWarningEvent) {
      console.log(`Warning! Machine ${event.machineId()} is low on stock!`);
    } else if (event instanceof SoldOutWarningEvent) {
      console.log(`Warning! Machine ${event.machineId()} is sold out!!!`);
    } else if (event instanceof StockLevelOkEvent) {
      console.log(
        `Machine ${event.machineId()} stock level is back to normal.`
      );
    }
  }
}

// Machine Sale Subscriber
class MachineSaleSubscriber implements ISubscriber {
  private machineRepo: MachineRepository;
  private pubSubService: IPublishSubscribeService;

  constructor(
    machineRepo: MachineRepository,
    pubSubService: IPublishSubscribeService
  ) {
    this.machineRepo = machineRepo;
    this.pubSubService = pubSubService;
  }

  handle(event: MachineSaleEvent): void {
    const machine = this.machineRepo.findById(event.machineId());
    if (machine) {
      machine.stockLevel -= event.getSoldQuantity();
      console.log(
        `Machine ${
          machine.id
        } sold ${event.getSoldQuantity()} items. Remaining stock: ${
          machine.stockLevel
        }`
      );

      // Trigger LowStockWarningEvent if stock drops below 3
      if (
        machine.stockLevel > 0 &&
        machine.stockLevel < 3 &&
        !machine.isLowStock
      ) {
        this.pubSubService.publish(new LowStockWarningEvent(machine.id));
        machine.isLowStock = true;
      }

      if (machine.stockLevel <= 0 && !machine.isSoldOut) {
        this.pubSubService.publish(new SoldOutWarningEvent(machine.id));
        machine.isLowStock = false;
        machine.isSoldOut = true;
      }

      this.machineRepo.updateMachine(machine);
    }
  }
}

// Machine Refill Subscriber
class MachineRefillSubscriber implements ISubscriber {
  private machineRepo: MachineRepository;
  private pubSubService: IPublishSubscribeService;

  constructor(
    machineRepo: MachineRepository,
    pubSubService: IPublishSubscribeService
  ) {
    this.machineRepo = machineRepo;
    this.pubSubService = pubSubService;
  }

  handle(event: MachineRefillEvent): void {
    const machine = this.machineRepo.findById(event.machineId());
    if (machine) {
      machine.stockLevel += event.getRefillQuantity();
      console.log(
        `Machine ${
          machine.id
        } refilled with ${event.getRefillQuantity()} items. New stock: ${
          machine.stockLevel
        }`
      );

      // Trigger StockLevelOkEvent if stock goes above or equal to 3
      if (
        machine.stockLevel >= 3 &&
        (machine.isLowStock || machine.isSoldOut)
      ) {
        this.pubSubService.publish(new StockLevelOkEvent(machine.id));
        machine.isLowStock = false;
        machine.isSoldOut = false;
      }

      this.machineRepo.updateMachine(machine);
    }
  }
}

// Machine class
class Machine {
  public stockLevel = 3;
  public id: string;
  public isLowStock = false; // Flag to track low stock status
  public isSoldOut = false; // Flag to track soldout status

  constructor(id: string) {
    this.id = id;
  }
}

// PubSub Service
class PublishSubscribeService implements IPublishSubscribeService {
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

// Helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return "001";
  } else if (random < 2) {
    return "002";
  }
  return "003";
};

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.25) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};

// Main Program
(async () => {
  // Initialize MachineRepository
  const machineRepo = new MachineRepository();

  // Add machines to the repository
  const machines = [
    new Machine("001"),
    new Machine("002"),
    new Machine("003"),
    new Machine("004"),
  ];
  machines.forEach((machine) => machineRepo.addMachine(machine));

  // Initialize PubSub service
  const pubSubService: IPublishSubscribeService = new PublishSubscribeService();

  // Create and subscribe MachineSale and MachineRefill event subscribers
  const saleSubscriber = new MachineSaleSubscriber(machineRepo, pubSubService);
  const refillSubscriber = new MachineRefillSubscriber(
    machineRepo,
    pubSubService
  );

  pubSubService.subscribe("sale", saleSubscriber);
  pubSubService.subscribe("refill", refillSubscriber);

  // Create stock warning subscriber and subscribe
  const stockWarningSubscriber = new StockWarningSubscriber();
  pubSubService.subscribe("lowStockWarning", stockWarningSubscriber);
  pubSubService.subscribe("stockLevelOk", stockWarningSubscriber);
  pubSubService.subscribe("SoldOutWarning", stockWarningSubscriber);

  // Generate and publish events
  const events = [1, 2, 3, 4, 5].map(() => eventGenerator());
  const lowStockEvent = new MachineSaleEvent(2, "004");
  const soldoutEvent = new MachineSaleEvent(1, "004");
  const refillToNormalEvent = new MachineRefillEvent(3, "004");

  events.forEach((event) => pubSubService.publish(event));
  pubSubService.publish(lowStockEvent);
  pubSubService.publish(soldoutEvent);
  pubSubService.publish(refillToNormalEvent);

  //Unsubscribe stockWarning then publish stock warning event
  pubSubService.unsubscribe("lowStockWarning", stockWarningSubscriber);
  pubSubService.unsubscribe("stockLevelOk", stockWarningSubscriber);
  pubSubService.unsubscribe("SoldOutWarning", stockWarningSubscriber);
  pubSubService.publish(lowStockEvent);
  pubSubService.publish(soldoutEvent);
  pubSubService.publish(refillToNormalEvent);
})();
