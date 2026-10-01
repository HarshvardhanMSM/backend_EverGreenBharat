export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly title: string,
  ) {}
}

export class NotificationBroadcastEvent {
  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly recipientCount: number,
  ) {}
}
