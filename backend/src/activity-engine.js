import { CampusTransportError } from './transport.js';
import { ResourceDriver } from './drivers/resource-driver.js';
import { FileDriver } from './drivers/file-driver.js';
import { AssignmentDriver } from './drivers/assignment-driver.js';
import { QuizDriver } from './drivers/quiz-driver.js';
import { GenericActivityDriver } from './drivers/generic-driver.js';

export class ActivityEngine {
  constructor({ registry, index, session, trace = null, fileService = null, formService = null } = {}) {
    this.registry = registry;
    this.index = index;
    this.session = session;
    this.trace = trace || session?.trace || null;
    this.fileService = fileService;
    this.formService = formService;
    this.drivers = new Map();
    this.registerDriver('resource', new ResourceDriver({ session, trace: this.trace, fileService }));
    this.registerDriver('file', new FileDriver({ session, trace: this.trace, fileService }));
    this.registerDriver('assign', new AssignmentDriver({ session, trace: this.trace, formService, fileService }));
    this.registerDriver('quiz', new QuizDriver({ session, trace: this.trace, formService }));
    this.generic = new GenericActivityDriver({ session, trace: this.trace });
    for (const type of ['resource', 'assign', 'quiz', 'file']) {
      const current = this.registry.resolve(type);
      this.registry.register(type, { driver: this.driverName(type), observed: current.observed, fallback: current.fallback });
    }
    for (const type of this.registry.observedTypes()) {
      if (!this.drivers.has(type)) this.registry.register(type, { driver: 'GenericActivityDriver', fallback: 'controlled-campus', observed: true });
    }
    this.registry.register('unknown', { driver: 'GenericActivityDriver', fallback: 'controlled-campus', observed: false });
  }

  driverName(type) {
    return {
      resource: 'ResourceDriver',
      file: 'FileDriver',
      assign: 'AssignmentDriver',
      quiz: 'QuizDriver',
    }[type] || 'GenericActivityDriver';
  }

  registerDriver(type, driver) {
    this.drivers.set(String(type).toLowerCase(), driver);
    return driver;
  }

  resolveActivity(ref) {
    const activity = this.index?.getActivity(ref);
    if (!activity) throw new CampusTransportError('Activity не найдена в текущем Activity Index.', { code: 'ACTIVITY_NOT_FOUND', phase: 'RESOLUTION' });
    return activity;
  }

  resolveDriver(activity) {
    return this.drivers.get(String(activity?.ref?.type || '').toLowerCase()) || this.generic;
  }

  getCapabilities(ref) {
    const activity = this.resolveActivity(ref);
    const driver = this.resolveDriver(activity);
    return {
      ...activity.capabilities,
      ...driver.getCapabilities(activity),
    };
  }

  getActions(ref) {
    const activity = this.resolveActivity(ref);
    return this.resolveDriver(activity).getActions(activity);
  }

  async discover(ref) {
    const activity = this.resolveActivity(ref);
    const driver = this.resolveDriver(activity);
    return { activity, driver: driver.discover(activity), capabilities: this.getCapabilities(ref), actions: this.getActions(ref), fallback: driver.getFallback(activity) };
  }

  async open(ref, options = {}) {
    return this.execute(ref, 'open', options.payload || {}, options);
  }

  async execute(ref, action, payload = {}, options = {}) {
    const activity = this.resolveActivity(ref);
    const driver = this.resolveDriver(activity);
    const parentTraceId = this.trace?.start({
      operation: `activity.${action}`,
      context: { activityRef: activity.ref, identityKey: activity.identityKey, type: activity.ref.type },
      transport: 'DRIVER',
      endpoint: activity.identity?.url || null,
      method: null,
      request: { action, payloadKeys: Object.keys(payload || {}) },
    });
    try {
      this.trace?.stage(parentTraceId, 'ACTIVITY_RESOLVED', { driver: driver.constructor.name, type: activity.ref.type });
      this.trace?.stage(parentTraceId, 'ACTION_SELECTED', { action });
      const result = await driver.executeAction(activity, action, payload, { ...options, parentTraceId });
      this.trace?.normalized(parentTraceId, { status: 'PASS', value: result });
      this.trace?.finish(parentTraceId, { status: 'PASS', action, driver: driver.constructor.name });
      return { ...result, traceId: parentTraceId, activity };
    } catch (error) {
      this.trace?.fail(parentTraceId, error, { phase: error?.phase || 'ACTIVITY' });
      throw error;
    }
  }

  fallback(ref) {
    const activity = this.resolveActivity(ref);
    return this.resolveDriver(activity).getFallback(activity);
  }
}
