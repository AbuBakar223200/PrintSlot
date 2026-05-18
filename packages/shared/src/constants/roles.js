"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionReason = exports.TransactionType = exports.PaymentMethod = exports.PickupMode = exports.ShopStatus = exports.Language = exports.Role = void 0;
var Role;
(function (Role) {
    Role["CUSTOMER"] = "CUSTOMER";
    Role["STAFF"] = "STAFF";
    Role["SHOP_OWNER"] = "SHOP_OWNER";
    Role["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
})(Role || (exports.Role = Role = {}));
var Language;
(function (Language) {
    Language["EN"] = "EN";
    Language["BN"] = "BN";
})(Language || (exports.Language = Language = {}));
var ShopStatus;
(function (ShopStatus) {
    ShopStatus["PENDING"] = "PENDING";
    ShopStatus["ACTIVE"] = "ACTIVE";
    ShopStatus["REJECTED"] = "REJECTED";
    ShopStatus["SUSPENDED"] = "SUSPENDED";
})(ShopStatus || (exports.ShopStatus = ShopStatus = {}));
var PickupMode;
(function (PickupMode) {
    PickupMode["QUEUE"] = "QUEUE";
    PickupMode["SLOT"] = "SLOT";
})(PickupMode || (exports.PickupMode = PickupMode = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["WALLET"] = "WALLET";
    PaymentMethod["CASH"] = "CASH";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionReason;
(function (TransactionReason) {
    TransactionReason["TOPUP_ADMIN"] = "TOPUP_ADMIN";
    TransactionReason["TOPUP_GATEWAY"] = "TOPUP_GATEWAY";
    TransactionReason["ORDER_PAYMENT"] = "ORDER_PAYMENT";
    TransactionReason["ORDER_REFUND"] = "ORDER_REFUND";
})(TransactionReason || (exports.TransactionReason = TransactionReason = {}));
//# sourceMappingURL=roles.js.map