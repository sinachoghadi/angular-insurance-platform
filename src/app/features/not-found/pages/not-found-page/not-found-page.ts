import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButton, MatIcon, RouterLink],
  styleUrl: './not-found-page.scss',
  templateUrl: './not-found-page.html',
})
export default class NotFoundPage {}
