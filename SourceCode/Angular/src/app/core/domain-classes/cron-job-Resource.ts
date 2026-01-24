import { ResourceParameter } from './resource-parameter';

export class CronJobResource extends ResourceParameter {
    jobName?: string = '';
    output?: string = '';
}