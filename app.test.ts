import {
  MachineSaleEvent,
  MachineRefillEvent,
  LowStockWarningEvent,
  StockLevelOkEvent,
  Machine,
  PublishSubscribeService,
  ISubscriber,
} from "./app";

describe("PublishSubscribeService", () => {
  let pubSubService: PublishSubscribeService;
  let machines: Machine[];

  beforeEach(() => {
    machines = [new Machine("001"), new Machine("002"), new Machine("003")];
    pubSubService = new PublishSubscribeService();
  });

  it("should notify the MachineSaleSubscriber when a MachineSaleEvent is published", () => {
    const saleSubscriber: ISubscriber = {
      handle: jest.fn(),
    };

    pubSubService.subscribe("sale", saleSubscriber);

    const saleEvent = new MachineSaleEvent(2, "001");
    pubSubService.publish(saleEvent);

    expect(saleSubscriber.handle).toHaveBeenCalledWith(saleEvent);
  });

  it("should notify the MachineRefillSubscriber when a MachineRefillEvent is published", () => {
    const refillSubscriber: ISubscriber = {
      handle: jest.fn(),
    };

    pubSubService.subscribe("refill", refillSubscriber);

    const refillEvent = new MachineRefillEvent(3, "002");
    pubSubService.publish(refillEvent);

    expect(refillSubscriber.handle).toHaveBeenCalledWith(refillEvent);
  });

  it("should not notify unsubscribed MachineSaleSubscriber after unsubscribing", () => {
    const saleSubscriber: ISubscriber = {
      handle: jest.fn(),
    };

    pubSubService.subscribe("sale", saleSubscriber);

    const saleEvent = new MachineSaleEvent(1, "001");
    pubSubService.publish(saleEvent);
    expect(saleSubscriber.handle).toHaveBeenCalledTimes(1);

    // Unsubscribe the subscriber
    pubSubService.unsubscribe("sale", saleSubscriber);
    pubSubService.publish(new MachineSaleEvent(1, "001"));

    // Should not be called again after unsubscribe
    expect(saleSubscriber.handle).toHaveBeenCalledTimes(1);
  });

  it("should notify LowStockWarningSubscriber when stock drops below threshold", () => {
    const lowStockWarningSubscriber: ISubscriber = {
      handle: jest.fn(),
    };

    pubSubService.subscribe("lowStockWarning", lowStockWarningSubscriber);

    // Trigger low stock with sale
    const saleSubscriber = new (class implements ISubscriber {
      handle(event: MachineSaleEvent): void {
        const machine = machines.find((m) => m.id === event.machineId());
        if (machine) {
          machine.stockLevel -= event.getSoldQuantity();
          if (machine.stockLevel < 3 && !machine.isLowStock) {
            pubSubService.publish(new LowStockWarningEvent(machine.id));
            machine.isLowStock = true;
          }
        }
      }
    })();

    pubSubService.subscribe("sale", saleSubscriber);

    const saleEvent = new MachineSaleEvent(9, "001"); // Reduce stock below 3
    pubSubService.publish(saleEvent);

    expect(lowStockWarningSubscriber.handle).toHaveBeenCalled();
    expect(lowStockWarningSubscriber.handle).toHaveBeenCalledWith(
      new LowStockWarningEvent("001")
    );
  });

  it("should notify StockLevelOkSubscriber when stock refilled above threshold", () => {
    const stockLevelOkSubscriber: ISubscriber = {
      handle: jest.fn(),
    };

    pubSubService.subscribe("stockLevelOk", stockLevelOkSubscriber);

    // Trigger stock level ok with refill
    const refillSubscriber = new (class implements ISubscriber {
      handle(event: MachineRefillEvent): void {
        const machine = machines.find((m) => m.id === event.machineId());
        if (machine) {
          machine.stockLevel += event.getRefillQuantity();
          if (machine.stockLevel >= 3 && machine.isLowStock) {
            pubSubService.publish(new StockLevelOkEvent(machine.id));
            machine.isLowStock = false;
          }
        }
      }
    })();

    pubSubService.subscribe("refill", refillSubscriber);

    // First, drop stock below threshold to simulate low stock
    const saleSubscriber = new (class implements ISubscriber {
      handle(event: MachineSaleEvent): void {
        const machine = machines.find((m) => m.id === event.machineId());
        if (machine) {
          machine.stockLevel -= event.getSoldQuantity();
          if (machine.stockLevel < 3) {
            machine.isLowStock = true;
          }
        }
      }
    })();

    pubSubService.subscribe("sale", saleSubscriber);
    pubSubService.publish(new MachineSaleEvent(8, "001")); // Drop stock below 3

    // Then refill stock to trigger stockLevelOk
    pubSubService.publish(new MachineRefillEvent(5, "001")); // Refill stock above 3

    expect(stockLevelOkSubscriber.handle).toHaveBeenCalled();
    expect(stockLevelOkSubscriber.handle).toHaveBeenCalledWith(
      new StockLevelOkEvent("001")
    );
  });
});
