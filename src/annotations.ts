export const enum AnnotationNameEnum {
  // visually complete metrics
  VC_IN_VIEWPORT_MUTATION_OBSERVED_COUNT = 'vc_in_viewport_mutation_observed_count',
  VC_INTERSECTIONS_SCHEDULED_COUNT = 'vc_intersections_scheduled_count',
  VC_MUTATIONS_OBSERVED_COUNT = 'vc_mutations_observed_count',
  VC_INTERSECTIONS_OBSERVED_COUNT = 'vc_intersections_observed_count',
  VC_TOTAL_MUTATION_CALLBACK_LATENCY_OVERHEAD_MS = 'vc_total_mutation_callback_latency_overhead_ms',
  VC_TOTAL_INTERSECTION_CALLBACK_LATENCY_OVERHEAD_MS = 'vc_total_intersection_callback_latency_overhead_ms',
  VC_TOTAL_CALLBACK_LATENCY_OVERHEAD_MS = 'vc_total_callback_latency_overhead_ms',
  VC_ELEMENTS_SCHEDULED_FOR_OBSERVATION_BUT_NOT_OBSERVED_COUNT = 'vc_elements_scheduled_for_observation_but_not_observed_count',
}

export type AddAnnotationType = (name: string, value: number | boolean | string) => void;

export type AnnotationsType = Map<string, number | boolean | string>;
