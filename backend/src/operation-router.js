import { CampusTransportError } from './transport.js';

/**
 * Thin operation router. It deliberately does not infer a transport from an
 * error response. The Contract Registry is the source of truth for routing.
 */
export class OperationRouter {
  constructor({ contracts, transport, trace = null } = {}) {
    if (!contracts || !transport) throw new Error('OperationRouter requires contracts and transport.');
    this.contracts = contracts;
    this.transport = transport;
    this.trace = trace || transport.trace || null;
  }

  resolve(operation) {
    return this.contracts.resolve(operation);
  }

  describe(operation) {
    const c = this.resolve(operation);
    return {
      name: c.name,
      source: c.source,
      verified: Boolean(c.verified),
      runtime: Boolean(c.runtime),
      transport: c.transport,
      endpoint: c.endpoint,
      method: c.method,
      staticParameters: { ...(c.staticParameters || {}) },
      dynamicParameters: [...(c.dynamicParameters || [])],
      requires: { ...(c.requires || {}) },
      response: { ...(c.response || {}) },
      parser: c.parser || 'none',
      fallback: c.fallback || null,
      retryPolicy: { ...(c.retryPolicy || {}) },
    };
  }

  async execute(operation, context = {}, params = {}, options = {}) {
    const contract = this.resolve(operation);
    if (contract.transport === 'UNKNOWN') {
      throw new CampusTransportError(`Для операции ${operation} не задан transport.`, {
        code: 'TRANSPORT_UNAVAILABLE',
        phase: 'CONTRACT',
        operation,
      });
    }
    return this.transport.execute(operation, context, params, options);
  }
}
