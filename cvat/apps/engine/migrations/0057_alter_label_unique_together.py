# Generated by Django 3.2.14 on 2022-07-19 06:27

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0056_auto_20220715_0752'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='label',
            unique_together={('task', 'name', 'parent')},
        ),
    ]
