import { AfterViewInit, Component } from '@angular/core';
import { Feature, Polygon } from 'geojson';
import { FeatureGrade } from 'src/app/types/feature-grade.type';
import { Offcanvas } from 'bootstrap';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements AfterViewInit {

  private offcanvas!: Offcanvas;

  overallScore: number | null = null;
  truePositiveCount: number = 0;
  falsePositiveCount: number = 0;
  falseNegativeCount: number = 0;
  unspecifiedCount: number = 0;
  totalCount: number = 0;

  constructor() { }

  ngAfterViewInit(): void {
    const element = document.getElementById('statistics-offcanvas')!;
    this.offcanvas = new Offcanvas(element);
  }

  show(relatedTarget: HTMLElement, overallScore: number | null, features: Map<number, Feature<Polygon, any>>): void {
    this.updateStatistics(overallScore, features);
    this.offcanvas.show(relatedTarget);
  }

  private updateStatistics(overallScore: number | null, features: Map<number, Feature<Polygon, any>>): void {
    this.overallScore = overallScore;
    this.truePositiveCount = 0;
    this.falsePositiveCount = 0;
    this.falseNegativeCount = 0;
    this.unspecifiedCount = 0;
    this.totalCount = features.size;

    if (this.totalCount === 0) {
      return;
    }

    for (const feature of features.values()) {
      switch (feature.properties.grade) {
        case FeatureGrade.TruePositive: this.truePositiveCount++; break;
        case FeatureGrade.FalsePositive: this.falsePositiveCount++; break;
        case FeatureGrade.FalseNegative: this.falseNegativeCount++; break;
        default: this.unspecifiedCount++; break;
      }
    }
  }

  countPercentage(count: number): number {
    return count / this.totalCount * 100;
  }

}
