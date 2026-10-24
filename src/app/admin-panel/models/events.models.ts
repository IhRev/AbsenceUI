export const absenceEventTypeNames = ['Create', 'Update', 'Delete'];

export interface EventDTO {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  absenceType: number;
  user: string;
  absenceEventType: number;
}

export class Event {
  public constructor(
    public num: number,
    public id: number,
    public name: string,
    public startDate: Date,
    public endDate: Date,
    public absenceType: string,
    public user: string,
    public type: string
  ) {}
}
