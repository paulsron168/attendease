import { DOCUMENT, NgClass } from '@angular/common';
import {
  Component,
  Inject,
  ElementRef,
  OnInit,
  Renderer2,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '@config';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { LanguageService, InConfiguration, AuthService } from '@core';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatMenuModule } from '@angular/material/menu';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatButtonModule } from '@angular/material/button';
import { MyProjectsService } from 'app/student/subject/subjects/subjects.service';
import { MyProjectsComponent } from 'app/student/subject/subjects/subjects.component';
import TimeAgo from 'javascript-time-ago'
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
// English.
import en from 'javascript-time-ago/locale/en'
import { SettingsService } from 'app/student/settings/settings.service';
interface Notifications {
  alert_id: number;
  roster_id: number;
  message: string;
  time: string;
  icon: string;
  color: string;
  status: string;
  is_read: number;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    NgClass,
    MatButtonModule,
    FeatherIconsComponent,
    MatMenuModule,
    NgScrollbar,
    CommonModule
  ],
  providers:[
    MyProjectsComponent
  ]
})
export class HeaderComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  public config!: InConfiguration;
  userImg?: string;
  homePage?: string;
  isNavbarCollapsed = true;
  userFullName:any;
  countryName: string | string[] = [];
  langStoreValue?: string;
  notif:any;
  notifList:any;
  isOpenSidebar?: boolean;
  docElement?: HTMLElement;
  isFullScreen = false;
  count_unread:number = 0;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService,
    private studentService: MyProjectsService,
    private settingServices:SettingsService,
    private studentComponent:MyProjectsComponent
  ) {
    super();
  }
  notifications: Notifications[] = [];
  
  ngOnInit() {

    this.config = this.configService.configData;
    this.docElement = document.documentElement;

    this.userFullName = this.authService.currentUserValue.firstName + ' ' + this.authService.currentUserValue.lastName;
    this.userImg = this.authService.currentUserValue.img;
    const userRole = this.authService.currentUserValue.role;

    let s_data = {};

    this.settingServices.getMyAccountData(this.authService.currentUserValue.id,s_data)
    .subscribe(
      response => {
        var user = response[0];
        this.userFullName = user.firstname + ' ' + user.lastname;
        this.userImg = user.profile_picture;
      },
      error => {
        console.error('Error getting section', error);
      }
    );


    if (userRole === 'Admin') {
      this.homePage = 'admin/dashboard/main';
    } else if (userRole === 'Student') {
      this.homePage = 'student/dashboard';
      this.getNotification(userRole);
    } else if (userRole === 'Teacher') {
      this.homePage = 'teacher/dashboard';
      this.getNotification(userRole);

    } else {
      this.homePage = 'admin/dashboard/main';
    }

  }

  check_trigger(roster_date:any,class_start:any,class_end:any){
    var d = new Date(roster_date);
    var check_start = class_start.split(':');
    d.setHours(check_start[0]);
    d.setMinutes(check_start[1]);
    d.setSeconds(check_start[2]);

    var e = new Date(roster_date);
    var check_end = class_end.split(':');
    e.setHours(check_end[0]);
    e.setMinutes(check_end[1]);
    e.setSeconds(check_end[2]);

    var datenow = new Date();
    // datenow.setHours(3);
    // datenow.setMinutes(4);
    // datenow.setSeconds(5);
  
    if(datenow >= d && datenow <= e){
      return true;
    }else{
      return false;
    }
  }

  trigger(alert_id:any,roster_id:any,is_read:any,class_start:any,notif:any){
    const currentUser = this.authService.currentUserValue;
    if(currentUser.role=="Student"){
      if(this.check_trigger(notif.roster_date,notif.class_start,notif.class_end)){
        if(is_read==0){
          let s_data = {};
    
          this.studentService.updateReadStatusNotifAlert(alert_id,s_data)
          .subscribe(
            response => {
              console.log(response);
            },
            error => {
              console.error('Error getting section', error);
            }
          );
        }
        this.studentComponent.PA(roster_id,class_start);
        
      } else{
        this.triggerDisable();
      }
    } else if(currentUser.role=="Teacher"){
      let s_data = {};

      this.studentService.updateReadStatusNotifTeacherAlert(alert_id,s_data)
      .subscribe(
        response => {
          Swal.fire({
            title: 'Information',
            icon: 'info',
            text: notif.message,
            allowOutsideClick: false,
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload();
            }
          });
        },
        error => {
          console.error('Error getting section', error);
        }
      );
    }
  }

  triggerDisable(){
    Swal.fire({
      title: 'Attendance Error',
      icon: 'error',
      text: 'Acknowledge for your attendance is already disabled',
    });
  }

  getNotification(userRole:any){
    TimeAgo.addDefaultLocale(en);
    const timeAgo = new TimeAgo('en-US');

    if(userRole === 'Student'){
      let s_data = {};
      const currentUser = this.authService.currentUserValue;
      this.studentService.getNotificationAlertsStudent(currentUser.id,s_data)
      .subscribe(
        response => {
         
          this.notif = response;
          this.notifList = [];
          this.notif.forEach((alert:any)=>{
            if(alert.is_read==0){
              this.count_unread++;
            }

            let s_data = {
              alert_id: alert.alert_id,
              roster_id: alert.roster_id,
              roster_date: alert.roster_date,
              class_start: alert.class_start,
              class_end: alert.class_end,
              message: 'Please use PIN: '+alert.roster_pin+' to acknowledge attendance',
              time: timeAgo.format((new Date().getTime()) - (new Date().getTime() - new Date(alert.created_datetime).getTime())),
              icon: 'mail',
              color: alert.is_read == 1 ? 'nfc-black':'nfc-blue',
              status: alert.is_read == 1 ? 'msg-read':'msg-unread',
              is_read:alert.is_read
            }
            this.notifList.push(s_data);

          });

        },
        error => {
          console.error('Error getting section', error);
        }
      );
    } else if (userRole === 'Teacher') {
      let s_data = {};
      const currentUser = this.authService.currentUserValue;
      this.studentService.getNotificationAlertsTeacher(currentUser.id,s_data)
      .subscribe(
        response => {
          console.log(response);
          this.notif = response;
          this.notifList = [];
          this.notif.forEach((alert:any)=>{
            if(alert.is_read==0){
              this.count_unread++;
            }
            
            let s_data = {
              alert_id: alert.id,
              roster_id: alert.roster_id,
              roster_date: "",
              class_start: "",
              class_end: "",
              message: alert.remarks,
              time: timeAgo.format((new Date().getTime()) - (new Date().getTime() - new Date(alert.created_datetime).getTime())),
              icon: 'mail',
              color: alert.is_read == 1 ? 'nfc-black':'nfc-blue',
              status: alert.is_read == 1 ? 'msg-read':'msg-unread',
              is_read:alert.is_read
            }
            this.notifList.push(s_data);

          });

        },
        error => {
          console.error('Error getting section', error);
        }
      );
    }
  }

  callFullscreen() {
    if (!this.isFullScreen) {
      if (this.docElement?.requestFullscreen != null) {
        this.docElement?.requestFullscreen();
      }
    } else {
      document.exitFullscreen();
    }
    this.isFullScreen = !this.isFullScreen;
  }
  mobileMenuSidebarOpen(event: Event, className: string) {
    const hasClass = (event.target as HTMLInputElement).classList.contains(
      className
    );
    if (hasClass) {
      this.renderer.removeClass(this.document.body, className);
    } else {
      this.renderer.addClass(this.document.body, className);
    }
  }
  callSidemenuCollapse() {
    const hasClass = this.document.body.classList.contains('side-closed');
    if (hasClass) {
      this.renderer.removeClass(this.document.body, 'side-closed');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'false');
    } else {
      this.renderer.addClass(this.document.body, 'side-closed');
      this.renderer.addClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'true');
    }
  }
  settings1(){
    const userRole = this.authService.currentUserValue.role;
    if (userRole === 'Admin') {
      this.router.navigate(['/admin/settings']);
    } else if (userRole === 'Student') {
      this.router.navigate(['/student/settings']);
    } else if (userRole === 'Teacher') {
      this.router.navigate(['/teacher/settings']);
    } 
  }
  logout() {
    this.subs.sink = this.authService.logout().subscribe((res) => {
      if (!res.success) {
        this.router.navigate(['/authentication/signin']);
      }
    });
  }
}
