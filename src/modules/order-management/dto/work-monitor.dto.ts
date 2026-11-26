export interface WorkMonitorOperatorDto {
  /** ID оператора */
  userId: number;
  /** Фамилия оператора */
  lastName: string;
  /** Имя оператора */
  firstName: string;
  /** Инициалы (первая буква фамилии и имени) для аватара */
  initials: string;
  /** Привязан ли оператор к станку сейчас */
  isBound: boolean;
  /** Станок, к которому привязан оператор (если привязан) */
  machineName: string | null;
  /** Производственный этап, на котором находится станок (если привязан) */
  stageName: string | null;
  /** Порядковый номер оператора на станке */
  operatorNumber: number | null;
  /** Время привязки к станку (начало текущей привязки, сегодня) */
  boundAt: string | null;
}
