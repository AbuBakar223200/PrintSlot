"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["QUEUED"] = "QUEUED";
    OrderStatus["SCHEDULED"] = "SCHEDULED";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["READY"] = "READY";
    OrderStatus["COLLECTED"] = "COLLECTED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_PLACED"] = "ORDER_PLACED";
    NotificationType["ORDER_ACCEPTED"] = "ORDER_ACCEPTED";
    NotificationType["ORDER_READY"] = "ORDER_READY";
    NotificationType["ORDER_CANCELLED"] = "ORDER_CANCELLED";
    NotificationType["NEW_ORDER"] = "NEW_ORDER";
    NotificationType["WALLET_TOPUP"] = "WALLET_TOPUP";
    NotificationType["WALLET_DEDUCTED"] = "WALLET_DEDUCTED";
    NotificationType["SHOP_APPROVED"] = "SHOP_APPROVED";
    NotificationType["SHOP_REJECTED"] = "SHOP_REJECTED";
    NotificationType["SHOP_SUSPENDED"] = "SHOP_SUSPENDED";
    NotificationType["STAFF_ASSIGNED"] = "STAFF_ASSIGNED";
    NotificationType["LOW_BALANCE"] = "LOW_BALANCE";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=orderStatus.js.map