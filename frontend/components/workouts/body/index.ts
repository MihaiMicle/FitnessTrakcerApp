// components/workouts/body/index.ts

import { MALE_FRONT } from './maleFront';
import { MALE_BACK } from './maleBack';
import { FEMALE_FRONT } from './femaleFront';
import { FEMALE_BACK } from './femaleBack';
import type { BodyPart, BodySex, BodyView } from './types';

const FIGURES: Record<BodySex, Record<BodyView, BodyPart[]>> = {
  male: { front: MALE_FRONT, back: MALE_BACK },
  female: { front: FEMALE_FRONT, back: FEMALE_BACK },
};

export function bodyFigure(sex: BodySex, view: BodyView) {
  return FIGURES[sex][view];
}

export { FIGURES };
export * from './types';
