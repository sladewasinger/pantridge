# API v1

The deployed API requires `Authorization: Bearer <Cognito access token>`. API Gateway validates issuer, audience, and `openid` scope. The server derives the owner exclusively from the JWT subject; clients cannot choose another user’s key.

## Read

`GET /v1/kitchen` returns a `{ revision, data }` envelope. The first read of an empty account initializes six starter foods through an idempotent transaction, returning revision 1 with `data.starterVersion: 1`. Existing nonempty accounts only receive the marker. Subsequent reads are read-only and strongly consistent. Responses use `Cache-Control: no-store`. See [inventory behavior](inventory-behavior.md) for initialization and deletion details.

## Apply a change

`POST /v1/mutations` accepts one mutation and returns the latest `{ revision, data }` envelope:

```json
{
  "id": "87e6e5c4-e9ce-426c-9c80-ae8c04366a80",
  "command": {
    "type": "stock.adjust",
    "stockId": "4588a22f-69a0-46fa-9274-367f1a36ce53",
    "delta": -1
  }
}
```

Generate the mutation UUID once and persist it before sending. Retries must reuse that same UUID. The server stores a permanent receipt per owner/mutation and cannot apply it twice. Every command is schema-validated in `src/domain/commands.ts`; inventory transitions live in `src/domain/reducer.ts`.

| Command              | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `food.save`          | Create/update a generic food identity and its shelf/location     |
| `food.remove`        | Delete food and stock, preserving linked groceries as standalone |
| `kitchen.initialize` | Initialize starter food once; never refill a cleared kitchen     |
| `stock.add`          | Add a quantity lot with an optional ISO calendar expiration date |
| `stock.adjust`       | Increment/decrement a lot, clamped to 0–9,999                    |
| `stock.date`         | Set or clear a lot’s expiration                                  |
| `shopping.save`      | Add/update a linked or one-time shopping entry                   |
| `shopping.purchase`  | Mark/unmark purchased without changing inventory                 |
| `shopping.remove`    | Remove an entry or finish a purchase without inventory tracking  |
| `shopping.putAway`   | Consume a purchased entry and add its stock exactly once         |

Counts are integers. Units are explicit, and package details are descriptive rather than automatic conversions. Dates use `YYYY-MM-DD`. Request bodies are capped at 16 KB; array and snapshot bounds are validated on the server.

Invalid input returns 400, unauthenticated requests 401, conflicting state/capacity 409, oversize requests 413, and transient storage errors 503. Preserve the outbox on any failure. A 409 requires reviewing the conflicting edit; repeating an identical invalid edit does not fix it.

## Future purchase import

The API and frontend do not import Walmart receipts yet. A future integration should map each retailer product to a generic food plus optional brand/package details, persist the source receipt/line identity, then create purchased shopping entries. Uncertain matches should appear in put-away review. The importer must retain stable mutation IDs across retries and have its own authenticated client. Imported purchases must not bypass the inventory reducer or duplicate quantities on repeated receipt uploads.
